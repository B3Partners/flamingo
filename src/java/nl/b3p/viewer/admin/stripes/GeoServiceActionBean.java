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
package nl.b3p.viewer.admin.stripes;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.annotation.security.RolesAllowed;
import net.sourceforge.stripes.action.*;
import net.sourceforge.stripes.validation.*;
import nl.b3p.viewer.config.services.*;
import nl.b3p.web.WaitPageStatus;
import org.apache.commons.logging.*;
import org.json.*;
import org.stripesstuff.plugin.waitpage.WaitPage;
import org.stripesstuff.stripersist.Stripersist;

/**
 *
 * @author Jytte Schaeffer
 */
@StrictBinding
@UrlBinding("/action/geoservice/{service}")
@RolesAllowed({"Admin","RegistryAdmin"})
public class GeoServiceActionBean implements ActionBean{
    private static final Log log = LogFactory.getLog(GeoServiceActionBean.class);
    
    private static final String JSP = "/WEB-INF/jsp/services/geoservice.jsp";
    
    private ActionBeanContext context;
    
    @Validate(on={"addForm","add","editCategory"},required=true)
    private Category category;
    
    @Validate(on="editGeoService",required=true)
    private GeoService service;

    @Validate(on="add", required=true)
    private String url;

    @Validate(on="add", required=true)
    private String protocol;

    private String categoryId;
    private String serviceId;
    
    @Validate
    private String name;
    
    @Validate
    private String username;
    @Validate
    private String password;
    
    @Validate(on="editCategory", required=true)
    private String categoryName;

    @Validate
    private boolean overrideUrl;
    
    @Validate
    private String serviceName;

    private WaitPageStatus status;
    
    private JSONObject newService;

    //<editor-fold defaultstate="collapsed" desc="getters en setters">
    public ActionBeanContext getContext() {
        return context;
    }
    
    public void setContext(ActionBeanContext context) {
        this.context = context;
    }

    public String getServiceName() {
        return serviceName;
    }

    public void setServiceName(String serviceName) {
        this.serviceName = serviceName;
    }

    public GeoService getService() {
        return service;
    }

    public void setService(GeoService service) {
        this.service = service;
    }

    public Category getCategory() {
        return category;
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public String getCategoryName() {
        return categoryName;
    }

    public void setCategoryName(String categoryName) {
        this.categoryName = categoryName;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getProtocol() {
        return protocol;
    }

    public void setProtocol(String protocol) {
        this.protocol = protocol;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public WaitPageStatus getStatus() {
        return status;
    }

    public void setStatus(WaitPageStatus status) {
        this.status = status;
    }

    public boolean isOverrideUrl() {
        return overrideUrl;
    }

    public void setOverrideUrl(boolean overrideUrl) {
        this.overrideUrl = overrideUrl;
    }

    public JSONObject getNewService() {
        return newService;
    }

    public void setNewService(JSONObject newService) {
        this.newService = newService;
    }

    public String getServiceId() {
        return serviceId;
    }

    public void setServiceId(String serviceId) {
        this.serviceId = serviceId;
    }
    
    public String getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(String categoryId) {
        this.categoryId = categoryId;
    }
    //</editor-fold>
    
    @DefaultHandler
    @HandlesEvent("default")
    public Resolution defaultResolution() {
        if(category != null){
            categoryName = category.getName();
        }
        return new ForwardResolution(JSP);
    }
    
    public Resolution cancel() {
        return new ForwardResolution(JSP);
    }
    
    public Resolution editGeoService() {
        if(service != null){
           protocol = service.getProtocol();
           url = service.getUrl();
           if(protocol.equals(ArcIMSService.PROTOCOL)) {
               ArcIMSService ser = (ArcIMSService)service;
               serviceName = ser.getServiceName();
           }
           name = service.getName();
           username = service.getUsername();
           password = service.getPassword();
        }
        return new ForwardResolution(JSP);
    }
    
    public Resolution saveService() {
        if(name != null){
            service.setName(name);
        }

        service.setUsername(username);
        service.setPassword(password);
        
        Stripersist.getEntityManager().persist(service);
        Stripersist.getEntityManager().getTransaction().commit();
        
        getContext().getMessages().add(new SimpleMessage("De service is opgeslagen"));
        
        return new ForwardResolution(JSP);
    }
    
    public Resolution deleteService(){
        /* Als een service layers heeft die toegevoegd zijn aan een applicatie 
         * mag de service niet verwijderd worden */
        this.setServiceId("s" + service.getId());
        Category c = service.getCategory();
        c.getServices().remove(service);
        
        List<FeatureSource> linkedSources = Stripersist.getEntityManager().createQuery(
                "from FeatureSource where linkedService = :service")
                .setParameter("service", service)
                .getResultList();
        for(FeatureSource fs: linkedSources) {
            fs.setLinkedService(null);
            getContext().getMessages().add(
                    new SimpleMessage("De bij deze service automatisch aangemaakte attribuutbron \"{0}\" moet apart worden verwijderd", fs.getName()));
                              
        }
        
        Stripersist.getEntityManager().remove(service);
        Stripersist.getEntityManager().getTransaction().commit();
        
        getContext().getMessages().add(new SimpleMessage("De service is verwijderd"));
        
        return new ForwardResolution(JSP);
    }
    
    public Resolution deleteCategory(){
        if(category.getChildren().size() > 0){
            getContext().getValidationErrors().addGlobalError(new SimpleError("De categorie bevat nog andere categorieën en kan niet verwijderd worden. "));
            return new ForwardResolution(JSP);
        }else if(category.getServices().size() > 0){
            getContext().getValidationErrors().addGlobalError(new SimpleError("De categorie bevat services en kan niet verwijderd worden. "));
            return new ForwardResolution(JSP);
        }
        
        this.setCategoryId("c" + category.getId());
        Category c = category.getParent();
        c.getChildren().remove(category);
        Stripersist.getEntityManager().persist(c);
        Stripersist.getEntityManager().remove(category);
        Stripersist.getEntityManager().getTransaction().commit();
        
        getContext().getMessages().add(new SimpleMessage("De categorie is verwijderd"));
        
        return new ForwardResolution(JSP);
    }
    
    public Resolution editCategory(){
        category.setName(categoryName);
        
        Stripersist.getEntityManager().persist(category);
        Stripersist.getEntityManager().getTransaction().commit();
        
        getContext().getMessages().add(new SimpleMessage("De categorie is opgeslagen"));
        
        return new ForwardResolution(JSP);
    }
    
    public Resolution addForm() {

        return new ForwardResolution(JSP);
    }

    @ValidationMethod(on="add")
    public void validateParams(ValidationErrors errors) {
        if(protocol.equals(ArcIMSService.PROTOCOL)) {
            if(serviceName == null) {
                errors.add("serviceName", new LocalizableError("validation.required.valueNotPresent"));
            }
        }
    }
    
    @WaitPage(path="/WEB-INF/jsp/waitpage.jsp", delay=2000, refresh=1000, ajax="/WEB-INF/jsp/waitpageajax.jsp")
    public Resolution add() throws JSONException {

        status = new WaitPageStatus();
        
        Map params = new HashMap();

        try {
            if(protocol.equals(WMSService.PROTOCOL)) {
                params.put(WMSService.PARAM_OVERRIDE_URL, overrideUrl);
                params.put(WMSService.PARAM_USERNAME, username);
                params.put(WMSService.PARAM_PASSWORD, password);
                service = new WMSService().loadFromUrl(url, params, status);
            } else if(protocol.equals(ArcGISService.PROTOCOL)) {
                params.put(ArcGISService.PARAM_USERNAME, username);
                params.put(ArcGISService.PARAM_PASSWORD, password);
                service = new ArcGISService().loadFromUrl(url, params, status);
            } else if(protocol.equals(ArcIMSService.PROTOCOL)) {
                params.put(ArcIMSService.PARAM_SERVICENAME, serviceName);
                params.put(ArcIMSService.PARAM_USERNAME, username);
                params.put(ArcIMSService.PARAM_PASSWORD, password);
                service = new ArcIMSService().loadFromUrl(url, params, status);
            } else {
                getContext().getValidationErrors().add("protocol", new SimpleError("Ongeldig"));
            }
        } catch(Exception e) {
            log.error("Exception loading " + protocol + " service from url " + url, e);
            String s = e.toString();
            if(e.getCause() != null) {
                s += "; cause: " + e.getCause().toString();
            }
            getContext().getValidationErrors().addGlobalError(new SimpleError("Fout bij het laden van de service: {2}", s));
            return new ForwardResolution(JSP);
        }

        if(name != null) {
            service.setName(name);
        }
        if(username != null) {
            service.setUsername(username);
        }
        if(password != null) {
            service.setPassword(password);
        }
        category = Stripersist.getEntityManager().find(Category.class, category.getId());
        service.setCategory(category);
        category.getServices().add(service);

        Stripersist.getEntityManager().persist(service);
        Stripersist.getEntityManager().getTransaction().commit();
        
        newService = new JSONObject();
        newService.put("id", "s" + service.getId());
        newService.put("name", service.getName());
        newService.put("type", "service");
        newService.put("isLeaf", service.getTopLayer() == null);
        newService.put("status", "ok");//Math.random() > 0.5 ? "ok" : "error");
        newService.put("parentid", "c"+category.getId());

        getContext().getMessages().add(new SimpleMessage("Service is ingeladen"));

        return new RedirectResolution(GeoServiceActionBean.class).flash(this);
    }
}
