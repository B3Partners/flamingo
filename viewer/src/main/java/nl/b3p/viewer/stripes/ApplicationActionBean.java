/*
 * Copyright (C) 2011 B3Partners B.V.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
package nl.b3p.viewer.stripes;

import java.io.File;
import java.io.IOException;
import java.util.*;
import javax.persistence.EntityManager;
import javax.persistence.NoResultException;
import javax.persistence.criteria.*;
import javax.servlet.http.HttpServletRequest;
import net.sourceforge.stripes.action.*;
import net.sourceforge.stripes.util.HtmlUtil;
import net.sourceforge.stripes.validation.LocalizableError;
import net.sourceforge.stripes.validation.Validate;
import org.stripesstuff.stripersist.Stripersist;
import nl.b3p.viewer.config.app.Application;
import nl.b3p.viewer.config.app.ConfiguredComponent;
import nl.b3p.viewer.config.security.Authorizations;
import org.json.JSONException;
import org.json.JSONObject;

/**
 *
 * @author Matthijs Laan
 */
@UrlBinding("/app/{name}/v{version}")
@StrictBinding
public class ApplicationActionBean implements ActionBean {

    private ActionBeanContext context;

    @Validate
    private String name;

    @Validate
    private String version;

    @Validate
    private boolean debug;

    private Application application;

    private String componentSourceHTML;
    private String appConfigJSON;

    private String viewerType;
    
    private JSONObject user;
    
    private String loginUrl;
    private JSONObject globalLayout;

    //<editor-fold defaultstate="collapsed" desc="getters en setters">
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public boolean isDebug() {
        return debug;
    }

    public void setDebug(boolean debug) {
        this.debug = debug;
    }

    public Application getApplication() {
        return application;
    }

    public void setApplication(Application application) {
        this.application = application;
    }

    public void setContext(ActionBeanContext context) {
        this.context = context;
    }

    public ActionBeanContext getContext() {
        return context;
    }

    public String getComponentSourceHTML() {
        return componentSourceHTML;
    }

    public void setComponentSourceHTML(String componentSourceHTML) {
        this.componentSourceHTML = componentSourceHTML;
    }

    public String getAppConfigJSON() {
        return appConfigJSON;
    }

    public void setAppConfigJSON(String appConfigJSON) {
        this.appConfigJSON = appConfigJSON;
    }
    
    public String getViewerType(){
        return viewerType;
    }
    
    public void setViewerType(String viewerType){
        this.viewerType = viewerType;
    }

    public JSONObject getUser() {
        return user;
    }

    public void setUser(JSONObject user) {
        this.user = user;
    }

    public String getLoginUrl() {
        return loginUrl;
    }

    public void setLoginUrl(String loginUrl) {
        this.loginUrl = loginUrl;
    }
    
    public JSONObject getGlobalLayout() {
        return globalLayout;
    }

    public void setGlobalLayout(JSONObject globalLayout) {
        this.globalLayout = globalLayout;
    }
    //</editor-fold>

    static Application findApplication(String name, String version) {
        EntityManager em = Stripersist.getEntityManager();
        if(name != null) {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery q = cb.createQuery(Application.class);
            Root<Application> root = q.from(Application.class);
            Predicate namePredicate = cb.equal(root.get("name"), name);
            Predicate versionPredicate = version != null
                    ? cb.equal(root.get("version"), version)
                    : cb.isNull(root.get("version"));
            q.where(cb.and(namePredicate, versionPredicate));
            try {
                return (Application) em.createQuery(q).getSingleResult();
            } catch(NoResultException nre) {
            }
        }
        return null;
    }

    public Resolution view() throws JSONException, IOException {
        application = findApplication(name, version);

        if(application == null) {
            getContext().getValidationErrors().addGlobalError(new LocalizableError("app.notfound", name + (version != null ? " v" + version : "")));
            return new ForwardResolution("/WEB-INF/jsp/error.jsp");
        }
        
        RedirectResolution login = new RedirectResolution(LoginActionBean.class)
                .addParameter("name", name) // binded parameters not included ?
                .addParameter("version", version)                     
                .addParameter("debug", debug)
                .includeRequestParameters(true);
        
        loginUrl = login.getUrl(context.getLocale()); 
        
        String username = context.getRequest().getRemoteUser();
        if(application.isAuthenticatedRequired() && username == null) {
            return login;
        }

        if(username != null) {
            user = new JSONObject();
            user.put("name", username);
            JSONObject roles = new JSONObject();
            user.put("roles", roles);
            for(String role: Authorizations.getRoles(context.getRequest())) {
                roles.put(role, Boolean.TRUE);
            }
        }
        
        buildComponentSourceHTML();
        
        appConfigJSON = application.toJSON(context.getRequest());
        this.viewerType = retrieveViewerType();
        this.globalLayout = application.getGlobalLayout();
        
        return new ForwardResolution("/WEB-INF/jsp/app.jsp");
    }
    
    /**
     * Build a hash key to make the single component source for all components
     * cacheable but updateable when the roles of the user change. This is not
     * meant to be a secure hash, the roles of a user are not secret.
     */
    public static int getRolesCachekey(HttpServletRequest request) {
        Set<String> roles = Authorizations.getRoles(request);
        
        if(roles.isEmpty()) {
            return 0;
        }
        
        List<String> sorted = new ArrayList<String>(roles);
        Collections.sort(sorted);
        
        int hash = 0;
        for(String role: sorted) {
            hash = hash ^ role.hashCode();
        }
        return hash;
    }
    
    private void buildComponentSourceHTML() throws IOException {
       
        StringBuilder sb = new StringBuilder();

        // Sort components by classNames, so order is always the same for debugging
        List<ConfiguredComponent> comps = new ArrayList<ConfiguredComponent>(application.getComponents());
        Collections.sort(comps);
        
        if(isDebug()) {
            
            Set<String> classNamesDone = new HashSet<String>();
            for(ConfiguredComponent cc: comps) {
                
                if(!Authorizations.isConfiguredComponentAuthorized(cc, context.getRequest())) {
                    continue;
                }
                
                if(!classNamesDone.contains(cc.getClassName())) {
                    classNamesDone.add(cc.getClassName());

                    if(cc.getViewerComponent() != null && cc.getViewerComponent().getSources() != null) {
                        for(File f: cc.getViewerComponent().getSources()) {
                            String url = new ForwardResolution(ComponentActionBean.class, "source")
                                    .addParameter("app", name)
                                    .addParameter("version", version)
                                    .addParameter("className", cc.getClassName())
                                    .addParameter("file", f.getName())
                                    .getUrl(context.getLocale());

                            sb.append("        <script type=\"text/javascript\" src=\"");
                            sb.append(HtmlUtil.encode(context.getServletContext().getContextPath() + url));
                            sb.append("\"></script>\n");
                        }
                    }
                }
            }
        } else {
            // If not debugging, create a single script tag with all source
            // for all components for the application for a minimal number of HTTP requests

            // The ComponentActionBean supports conditional HTTP requests using
            // Last-Modified.
            // Create a hash value that will change when the classNames used
            // in the application change, so that a browser will not use a
            // previous version from cache with other contents.
            
            int hash = 0;
            Set<String> classNamesDone = new HashSet<String>();
            for(ConfiguredComponent cc: comps) {
                if(!Authorizations.isConfiguredComponentAuthorized(cc, context.getRequest())) {
                    continue;
                }
                
                if(!classNamesDone.contains(cc.getClassName())) {
                    hash = hash ^ cc.getClassName().hashCode();
                } else {
                    classNamesDone.add(cc.getClassName());
                }
            }
            if(user != null) {
                // Update component sources when roles of user change
                hash = hash ^ getRolesCachekey(context.getRequest());
                
                // Update component sources when roles of configured components
                // may have changed
                hash = hash ^ (int)application.getAuthorizationsModified().getTime();
            }            

            String url = new ForwardResolution(ComponentActionBean.class, "source")
                    .addParameter("app", name)
                    .addParameter("version", version)
                    .addParameter("minified", true)
                    .addParameter("hash", hash)
                    .getUrl(context.getLocale());

            sb.append("        <script type=\"text/javascript\" src=\"");
            sb.append(HtmlUtil.encode(context.getServletContext().getContextPath() + url));
            sb.append("\"></script>\n");
        }

        componentSourceHTML = sb.toString();
    }
    
    private String retrieveViewerType (){
        String type = "FlamingoMap";
        String typePrefix = "viewer.mapcomponents";
        Set<ConfiguredComponent> components = application.getComponents();
        for (ConfiguredComponent component : components) {
            String className = component.getClassName();
            if(className.startsWith(typePrefix)){
                type = className.substring(typePrefix.length() +1).toLowerCase().replace("map", "");
                break;
            }
        }
        return type;
    }
}
