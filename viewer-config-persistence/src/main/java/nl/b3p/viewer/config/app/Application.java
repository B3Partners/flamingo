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
package nl.b3p.viewer.config.app;

import nl.b3p.viewer.config.ClobElement;
import java.util.*;
import javax.persistence.*;
import javax.servlet.http.HttpServletRequest;
import nl.b3p.viewer.config.security.Authorizations;
import nl.b3p.viewer.config.security.User;
import nl.b3p.viewer.config.services.BoundingBox;
import nl.b3p.viewer.config.services.GeoService;
import org.apache.commons.beanutils.BeanUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.stripesstuff.stripersist.Stripersist;

/**
 *
 * @author Matthijs Laan
 */
@Entity
@Table(
        uniqueConstraints=
            @UniqueConstraint(columnNames={"name", "version"})
)
public class Application {
    public static final String DETAIL_LAST_SPINUP_TIME = "lastSpinupTime";
    
    private static Set adminOnlyDetails = new HashSet<String>(Arrays.asList(new String[] { 
        "opmerking" 
    }));  
    
    @Id
    private Long id;

    @Basic(optional=false)
    private String name;

    @Column(length=30)
    private String version;

    @Lob
    @org.hibernate.annotations.Type(type="org.hibernate.type.StringClobType")
    private String layout;

    @ElementCollection
    @JoinTable(joinColumns=@JoinColumn(name="application"))
    // Element wrapper required because of http://opensource.atlassian.com/projects/hibernate/browse/JPA-11
    private Map<String,ClobElement> details = new HashMap<String,ClobElement>();

    @ManyToOne
    private User owner;

    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "crs.name", column = @Column(name="start_crs")),
        @AttributeOverride(name = "minx", column = @Column(name="start_minx")),
        @AttributeOverride(name = "maxx", column = @Column(name="start_maxx")),
        @AttributeOverride(name = "miny", column = @Column(name="start_miny")),
        @AttributeOverride(name = "maxy", column = @Column(name="start_maxy"))
    })
    private BoundingBox startExtent;
    
    @Embedded
    @AttributeOverrides({
        @AttributeOverride(name = "crs.name", column = @Column(name="max_crs")),
        @AttributeOverride(name = "minx", column = @Column(name="max_minx")),
        @AttributeOverride(name = "maxx", column = @Column(name="max_maxx")),
        @AttributeOverride(name = "miny", column = @Column(name="max_miny")),
        @AttributeOverride(name = "maxy", column = @Column(name="max_maxy"))
    })
    private BoundingBox maxExtent;

    private boolean authenticatedRequired ;

    @ManyToOne(cascade=CascadeType.ALL, fetch=FetchType.LAZY)
    private Level root;

    @OneToMany(orphanRemoval=true, cascade=CascadeType.ALL, mappedBy="application")
    private Set<ConfiguredComponent> components = new HashSet<ConfiguredComponent>();

    @Basic(optional=false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date authorizationsModified = new Date();    
    
    // <editor-fold defaultstate="collapsed" desc="getters and setters">
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

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

    public String getLayout() {
        return layout;
    }

    public void setLayout(String layout) {
        this.layout = layout;
    }

    public Map<String, ClobElement> getDetails() {
        return details;
    }

    public void setDetails(Map<String, ClobElement> details) {
        this.details = details;
    }

    public boolean isAuthenticatedRequired() {
        return authenticatedRequired;
    }

    public void setAuthenticatedRequired(boolean authenticatedRequired) {
        this.authenticatedRequired = authenticatedRequired;
    }

    public Set<ConfiguredComponent> getComponents() {
        return components;
    }

    public void setComponents(Set<ConfiguredComponent> components) {
        this.components = components;
    }

    public BoundingBox getMaxExtent() {
        return maxExtent;
    }

    public void setMaxExtent(BoundingBox maxExtent) {
        this.maxExtent = maxExtent;
    }

    public User getOwner() {
        return owner;
    }

    public void setOwner(User owner) {
        this.owner = owner;
    }

    public Level getRoot() {
        return root;
    }

    public void setRoot(Level root) {
        this.root = root;
    }

    public BoundingBox getStartExtent() {
        return startExtent;
    }

    public void setStartExtent(BoundingBox startExtent) {
        this.startExtent = startExtent;
    }

    public Date getAuthorizationsModified() {
        return authorizationsModified;
    }

    public void setAuthorizationsModified(Date authorizationsModified) {
        this.authorizationsModified = authorizationsModified;
    }
    //</editor-fold>
    
    public String getNameWithVersion() {
        String n = getName();
        if(getVersion() != null) {
            n += " v" + getVersion();
        }
        return n;
    }  

    public static class TreeCache {
        List<Level> levels;
        Map<Level,List<Level>> childrenByParent;
        List<ApplicationLayer> applicationLayers;

        public List<ApplicationLayer> getApplicationLayers() {
            return applicationLayers;
        }

        public List<Level> getChildren(Level l) {
            List<Level> children = childrenByParent.get(l);
            if(children == null) {
                return Collections.EMPTY_LIST;
            } else {
                return children;
            }
        }

        public List<Level> getLevels() {
            return levels;
        }
    }
    
    @Transient
    private TreeCache treeCache;
    
    public TreeCache loadTreeCache() {
        if(treeCache == null) {
            
            treeCache = new TreeCache();
            
            // Retrieve level tree structure in single query
            treeCache.levels = Stripersist.getEntityManager().createNamedQuery("getLevelTree")
                .setParameter("rootId", root.getId())
                .getResultList();
            
            // Prevent n+1 queries for each level            
            Stripersist.getEntityManager().createQuery("from Level l "
                    + "left join fetch l.layers "
                    + "where l in (:levels) ")
                    .setParameter("levels", treeCache.levels)
                    .getResultList();    
            
            treeCache.childrenByParent = new HashMap();
            treeCache.applicationLayers = new ArrayList();
            
            for(Level l: treeCache.levels) {
                treeCache.applicationLayers.addAll(l.getLayers());
                
                if(l.getParent() != null) {
                    List<Level> parentChildren = treeCache.childrenByParent.get(l.getParent());
                    if(parentChildren == null) {
                        parentChildren = new ArrayList<Level>();
                        treeCache.childrenByParent.put(l.getParent(), parentChildren);
                    }
                    parentChildren.add(l);
                }
            }
            
        }
        return treeCache;
    }

    public void authorizationsModified() {
        authorizationsModified = new Date();
    }
    
    /**
     * Create a JSON representation for use in browser to start this application
     * @return
     */
    public String toJSON(HttpServletRequest request) throws JSONException {
        JSONObject o = new JSONObject();

        o.put("id", id);
        o.put("name", name);
        if(layout != null) {
            o.put("layout", new JSONObject(layout));
        }

        JSONObject d = new JSONObject();
        o.put("details", d);
        for(Map.Entry<String,ClobElement> e: details.entrySet()) {
            if(!adminOnlyDetails.contains(e.getKey())) {
                d.put(e.getKey(), e.getValue());
            }
        }

        if(startExtent != null) {
            o.put("startExtent", startExtent.toJSONObject());
        }
        if(maxExtent != null) {
            o.put("maxExtent", maxExtent.toJSONObject());
        }
        
        /* TODO check readers */
        
        if(root != null) {
            o.put("rootLevel", root.getId().toString());

            loadTreeCache();
            
            // Prevent n+1 queries for each level            
            Stripersist.getEntityManager().createQuery("from Level l "
                    + "left join fetch l.documents "
                    + "where l in (:levels) ")
                    .setParameter("levels", treeCache.levels)
                    .getResultList();            

            if(!treeCache.applicationLayers.isEmpty()) {
                // Prevent n+1 queries for each ApplicationLayer            
                Stripersist.getEntityManager().createQuery("from ApplicationLayer al "
                        + "left join fetch al.details "
                        + "where al in (:alayers) ")
                        .setParameter("alayers", treeCache.applicationLayers)
                        .getResultList();
            }

            JSONObject levels = new JSONObject();
            o.put("levels", levels);
            JSONObject appLayers = new JSONObject();
            o.put("appLayers", appLayers);
            JSONArray selectedContent = new JSONArray();
            o.put("selectedContent", selectedContent);         
            
            List selectedObjects = new ArrayList();
            walkAppTreeForJSON(levels, appLayers, selectedObjects, root, false, request);

            Collections.sort(selectedObjects, new Comparator() {

                @Override
                public int compare(Object lhs, Object rhs) {
                    Integer lhsIndex, rhsIndex;
                    if(lhs instanceof Level) {
                        lhsIndex = ((Level)lhs).getSelectedIndex();
                    } else {
                        lhsIndex = ((ApplicationLayer)lhs).getSelectedIndex();
                    }
                    if(rhs instanceof Level) {
                        rhsIndex = ((Level)rhs).getSelectedIndex();
                    } else {
                        rhsIndex = ((ApplicationLayer)rhs).getSelectedIndex();
                    }
                    return lhsIndex.compareTo(rhsIndex);
                }
            });
            for(Object obj: selectedObjects) {
                JSONObject j = new JSONObject();
                if(obj instanceof Level) {
                    j.put("type", "level");
                    j.put("id", ((Level)obj).getId().toString());
                } else {
                    j.put("type", "appLayer");
                    j.put("id", ((ApplicationLayer)obj).getId().toString());
                }
                selectedContent.put(j);
            }
           
            Map<GeoService,Set<String>> usedLayersByService = new HashMap<GeoService,Set<String>>();
            visitLevelForUsedServicesLayers(root, usedLayersByService, request);

            if(!usedLayersByService.isEmpty()) {
                JSONObject services = new JSONObject();
                o.put("services", services);
                for(Map.Entry<GeoService,Set<String>> entry: usedLayersByService.entrySet()) {
                    GeoService gs = entry.getKey();
                    Set<String> usedLayers = entry.getValue();
                    services.put(gs.getId().toString(), gs.toJSONObject(false, usedLayers));
                }
            }           
        }

        // Prevent n+1 query for ConfiguredComponent.details
        Stripersist.getEntityManager().createQuery(
                "from ConfiguredComponent cc left join fetch cc.details where application = :this")
                .setParameter("this", this)
                .getResultList();
        
        JSONObject c = new JSONObject();
        o.put("components", c);
        for(ConfiguredComponent comp: components) {
            if(Authorizations.isConfiguredComponentAuthorized(comp, request)) {
                c.put(comp.getName(), comp.toJSON());
            }
        }

        return o.toString(4);
    }
    
    private void walkAppTreeForJSON(JSONObject levels, JSONObject appLayers, List selectedContent, Level l, boolean parentIsBackground, HttpServletRequest request) throws JSONException {
        JSONObject o = l.toJSONObject(false, this, request);
        o.put("background", l.isBackground() || parentIsBackground);
        levels.put(l.getId().toString(), o);
        
        if(l.getSelectedIndex() != null) {
            selectedContent.add(l);
        }
        
        for(ApplicationLayer al: l.getLayers()) {
            if(!Authorizations.isAppLayerReadAuthorized(this, al, request)) {
                //System.out.printf("Application layer %d (service #%s %s layer %s) in level %d %s unauthorized\n", al.getId(), al.getService().getId(), al.getService().getName(), al.getLayerName(), l.getId(), l.getName());
                continue;
            }
            JSONObject p = al.toJSONObject();
            p.put("background", l.isBackground() || parentIsBackground);
            p.put("editAuthorized", Authorizations.isAppLayerWriteAuthorized(this, al, request));
            appLayers.put(al.getId().toString(), p);
            
            if(al.getSelectedIndex() != null) {
                selectedContent.add(al);
            }
        }
        
        List<Level> children = treeCache.childrenByParent.get(l);
        if(children != null) {
            JSONArray jsonChildren = new JSONArray();
            o.put("children", jsonChildren);
            for(Level child: children) {
                if (Authorizations.isLevelReadAuthorized(this, child, request)){
                    jsonChildren.put(child.getId().toString());
                    walkAppTreeForJSON(levels, appLayers, selectedContent, child, l.isBackground(), request);
                }
            }
        }
    }
    
    private void visitLevelForUsedServicesLayers(Level l, Map<GeoService,Set<String>> usedLayersByService, HttpServletRequest request) {
        if(!Authorizations.isLevelReadAuthorized(this, l, request)) {
            return;
        }
        
        for(ApplicationLayer al: l.getLayers()) {
            if(!Authorizations.isAppLayerReadAuthorized(this, al, request)) {
                continue;
            }            
            GeoService gs = al.getService();
            
            Set<String> usedLayers = usedLayersByService.get(gs);
            if(usedLayers == null) {
                usedLayers = new HashSet<String>();
                usedLayersByService.put(gs, usedLayers);
            }
            usedLayers.add(al.getLayerName());
        }
        List<Level> children = treeCache.childrenByParent.get(l);
        if(children != null) {        
            for(Level child: children) {
                visitLevelForUsedServicesLayers(child, usedLayersByService, request);
            }        
        }
    }
    
    public Boolean isMashup(){
         if(this.getDetails().containsKey("isMashup")){
             String mashupValue = this.getDetails().get("isMashup").getValue();
             Boolean mashup = Boolean.valueOf(mashupValue);
             return mashup;
         }else{
             return false;
         }
    }

    public Application deepCopy() throws Exception {
        
        Application copy = (Application) BeanUtils.cloneBean(this);   
        copy.setId(null);
        
        // user reference is not deep copied, of course
        
        copy.setDetails(new HashMap<String,ClobElement>(details));
        if(startExtent != null) {
            copy.setStartExtent(startExtent.clone());
        }
        if(maxExtent != null) {
            copy.setMaxExtent(maxExtent.clone());
        }
        
        copy.setComponents(new HashSet<ConfiguredComponent>());
        for(ConfiguredComponent cc: components) {
            copy.getComponents().add(cc.deepCopy(copy));
        }
        
        if(root != null) {
            copy.setRoot(root.deepCopy(null));
        }
        
        return copy;
    }

    public void removeOldProperties()
    {
        // In previous versions maxHeight and maxWidth where assigned to details directly
        // Now these settings are saved in globalLayout. We are removing these settings from
        // details (when present) to migrate from old layout to new layout
        if(this.details.containsKey("maxWidth")) {
            this.details.remove("maxWidth");
        }
        if(this.details.containsKey("maxHeight")) {
            this.details.remove("maxHeight");
        }
    }
    
    public void setGlobalLayout(String globalLayout) {
        this.details.put("globalLayout", new ClobElement(globalLayout));
    }
    
    public JSONObject getGlobalLayout() throws JSONException {
        JSONObject globalLayout = new JSONObject();
        if(this.getDetails().containsKey("globalLayout")) {
            globalLayout = new JSONObject(this.getDetails().get("globalLayout").getValue());
        }
        // Legacy properties
        if(!globalLayout.has("maxWidth") && this.getDetails().containsKey("maxWidth")) {
            globalLayout.put("maxWidth", this.getDetails().get("maxWidth").getValue());
        }
        if(!globalLayout.has("maxHeight") && this.getDetails().containsKey("maxHeight")) {
            globalLayout.put("maxHeight", this.getDetails().get("maxHeight").getValue());
        }
        return globalLayout;
    }
}
