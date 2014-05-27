/*
 * Copyright (C) 2012-2013 B3Partners B.V.
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

import java.text.SimpleDateFormat;
import java.util.*;
import javax.annotation.security.RolesAllowed;
import javax.persistence.NoResultException;
import net.sourceforge.stripes.action.*;
import net.sourceforge.stripes.validation.*;
import nl.b3p.viewer.config.ClobElement;
import nl.b3p.viewer.config.app.*;
import nl.b3p.viewer.config.security.Group;
import nl.b3p.viewer.config.security.User;
import nl.b3p.viewer.config.services.BoundingBox;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.stripesstuff.stripersist.Stripersist;

/**
 *
 * @author Jytte Schaeffer
 */
@UrlBinding("/action/applicationsettings/")
@StrictBinding
@RolesAllowed({Group.ADMIN,Group.APPLICATION_ADMIN}) 
public class ApplicationSettingsActionBean extends ApplicationActionBean {
    private static final Log log = LogFactory.getLog(ApplicationSettingsActionBean.class);
    
    private static final String JSP = "/WEB-INF/jsp/application/applicationSettings.jsp";
    
    private static final String DEFAULT_SPRITE = "/resources/images/default_sprite.png";
    
    @Validate
    private String name;
    @Validate
    private String version;
    @Validate
    private String owner;
    @Validate
    private boolean authenticatedRequired;
    
    @Validate
    private String mashupName;
    
    @Validate
    private Map<String,ClobElement> details = new HashMap<String,ClobElement>();
    
    @ValidateNestedProperties({
                @Validate(field="minx", maxlength=255),
                @Validate(field="miny", maxlength=255),
                @Validate(field="maxx", maxlength=255),
                @Validate(field="maxy", maxlength=255)
    })
    private BoundingBox startExtent;
    
    @ValidateNestedProperties({
                @Validate(field="minx", maxlength=255),
                @Validate(field="miny", maxlength=255),
                @Validate(field="maxx", maxlength=255),
                @Validate(field="maxy", maxlength=255)
    })
    private BoundingBox maxExtent;
    
    @Validate
    private Double maxScale;

    //<editor-fold defaultstate="collapsed" desc="getters & setters">

    public Map<String,ClobElement> getDetails() {
        return details;
    }

    public void setDetails(Map<String, ClobElement> details) {
        this.details = details;
    }

    public boolean getAuthenticatedRequired() {
        return authenticatedRequired;
    }

    public void setAuthenticatedRequired(boolean authenticatedRequired) {
        this.authenticatedRequired = authenticatedRequired;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getOwner() {
        return owner;
    }

    public void setOwner(String owner) {
        this.owner = owner;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public BoundingBox getStartExtent() {
        return startExtent;
    }

    public void setStartExtent(BoundingBox startExtent) {
        this.startExtent = startExtent;
    }

    public BoundingBox getMaxExtent() {
        return maxExtent;
    }

    public void setMaxExtent(BoundingBox maxExtent) {
        this.maxExtent = maxExtent;
    }

    public String getMashupName() {
        return mashupName;
    }

    public void setMashupName(String mashupName) {
        this.mashupName = mashupName;
    }
    
    public Double getMaxScale() {
        return maxScale;
    }
    
    public void setMaxScale(Double maxScale) {
        this.maxScale = maxScale;
        
        // Also update the value in details, so that the info is persisted there
        details.put("maxScale", new ClobElement(String.valueOf(maxScale)));
    }
    
    //</editor-fold>
    
    @DefaultHandler
    @DontValidate
    public Resolution view(){
        if(application != null){
            details = application.getDetails();
            if(application.getOwner() != null){
                owner = application.getOwner().getUsername();
            }
            startExtent = application.getStartExtent();
            maxExtent = application.getMaxExtent();
            name = application.getName();
            version = application.getVersion();
            authenticatedRequired = application.isAuthenticatedRequired();
        
            if(details.get("maxScale") != null) {
                String maxScaleValue = details.get("maxScale").getValue();
                if(maxScaleValue != null) {
                    try {
                        setMaxScale(Double.parseDouble(maxScaleValue));
                    } catch (NumberFormatException nfe) {
                        // Ignore, max scale contains an invalid value
                    }
                }
            }
        }
        // DEFAULT VALUES
        if(!details.containsKey("iconSprite")) {
            details.put("iconSprite", new ClobElement(DEFAULT_SPRITE));
        }
        if(!details.containsKey("stylesheetMetadata")) {
            // TODO: Default value stylesheet metadata
            details.put("stylesheetMetadata", new ClobElement(""));
        }
        if(!details.containsKey("stylesheetPrint")) {
            // TODO: Default value stylesheet printen
            details.put("stylesheetPrint", new ClobElement(""));
        }
        return new ForwardResolution(JSP);
    }
    
    @DontValidate
    public Resolution newApplication(){
        application = null;
        applicationId = -1L;
        // DEFAULT VALUES
        details.put("iconSprite", new ClobElement(DEFAULT_SPRITE));
        // TODO: Default value stylesheet metadata
        details.put("stylesheetMetadata", new ClobElement(""));
        // TODO: Default value stylesheet printen
        details.put("stylesheetPrint", new ClobElement(""));
        return new ForwardResolution(JSP);
    }
    
    @DontBind
    public Resolution cancel() {        
        return new ForwardResolution(JSP);
    }
    
    public Resolution save() {
        if(application == null){
            application = new Application();
            
            /*
             * A new application always has a root and a background level.
             */
            Level root = new Level();
            root.setName("Applicatie");
            
            Level background = new Level();
            background.setName("Achtergrond");
            background.setBackground(true);
            root.getChildren().add(background);
            background.setParent(root);
            
            Stripersist.getEntityManager().persist(background);
            Stripersist.getEntityManager().persist(root);
            application.setRoot(root);
        }
        
        bindAppProperties();
        
        Stripersist.getEntityManager().persist(application);
        Stripersist.getEntityManager().getTransaction().commit();
        
        getContext().getMessages().add(new SimpleMessage("Applicatie is opgeslagen"));

        setApplication(application);
        
        return new ForwardResolution(JSP);
    }
    
    /* XXX */
    private void bindAppProperties() {

        application.setName(name);
        application.setVersion(version);

        if (owner != null) {
            User appOwner = Stripersist.getEntityManager().find(User.class, owner);
            application.setOwner(appOwner);
        }
        application.setStartExtent(startExtent);

        application.setMaxExtent(maxExtent);

        application.setAuthenticatedRequired(authenticatedRequired);
        Map<String, ClobElement> backupDetails = new HashMap();
        for (Map.Entry<String, ClobElement> e : application.getDetails().entrySet()) {
            if (Application.preventClearDetails.contains(e.getKey())) {
                details.put(e.getKey(), e.getValue());
            }
        }
        
        application.getDetails().clear();
        application.getDetails().putAll(details);
    }

    @ValidationMethod(on="save")
    public void validate(ValidationErrors errors) throws Exception {
        if(name == null) {
            errors.add("name", new SimpleError("Naam is verplicht"));
            return;
        }
        
        try {
            Long foundId = null;
            if(version == null){
                foundId = (Long)Stripersist.getEntityManager().createQuery("select id from Application where name = :name and version is null")
                        .setMaxResults(1)
                        .setParameter("name", name)
                        .getSingleResult();
            }else{                   
                foundId = (Long)Stripersist.getEntityManager().createQuery("select id from Application where name = :name and version = :version")
                        .setMaxResults(1)
                        .setParameter("name", name)
                        .setParameter("version", version)
                        .getSingleResult();
            }

            if(application != null && application.getId() != null){
                if( !foundId.equals(application.getId()) ){
                    errors.add("name", new SimpleError("Naam en versie moeten een unieke combinatie vormen.")); 
                }
            }else{
                errors.add("name", new SimpleError("Naam en versie moeten een unieke combinatie vormen."));
            }
        } catch(NoResultException nre) {
            // name version combination is unique
        }
        
        /*
         * Check if owner is an excisting user
         */
        if(owner != null){
            try {
                User appOwner = Stripersist.getEntityManager().find(User.class, owner);
                if(appOwner == null){
                    errors.add("owner", new SimpleError("Gebruiker met deze naam bestaat niet."));
                }
            } catch(NoResultException nre) {
                errors.add("owner", new SimpleError("Gebruiker met deze naam bestaat niet."));
            }
        }
        if(startExtent != null){
            if(startExtent.getMinx() == null || startExtent.getMiny() == null || startExtent.getMaxx() == null || startExtent.getMaxy() == null ){
                errors.add("startExtent", new SimpleError("Alle velden van de start extentie moeten ingevuld worden."));
            }
        }
        if(maxExtent != null){
            if(maxExtent.getMinx() == null || maxExtent.getMiny() == null || maxExtent.getMaxx() == null || maxExtent.getMaxy() == null ){
                errors.add("maxExtent", new SimpleError("Alle velden van de max extentie moeten ingevuld worden."));
            }
        }
    }
    
    public Resolution copy() throws Exception {
        
        try {
            Object o = Stripersist.getEntityManager().createQuery("select 1 from Application where name = :name")
                .setMaxResults(1)
                .setParameter("name", name)
                .getSingleResult();
            
            getContext().getMessages().add(new SimpleMessage("Kan niet kopieren; applicatie met naam \"{0}\" bestaat al", name));
            return new RedirectResolution(this.getClass());
        } catch(NoResultException nre) {
            // name is unique
        }

        try {
            bindAppProperties();

            Application copy = application.deepCopy();

            // don't save changes to original app
            Stripersist.getEntityManager().detach(application);

            Stripersist.getEntityManager().persist(copy);
            Stripersist.getEntityManager().persist(copy);
            Stripersist.getEntityManager().flush();
            Stripersist.getEntityManager().getTransaction().commit();

            getContext().getMessages().add(new SimpleMessage("Applicatie is gekopieerd"));
            setApplication(copy);   
            
            return new RedirectResolution(this.getClass());
        } catch(Exception e) {
            log.error(String.format("Error copying application #%d named %s %swith new name %s",
                    application.getId(),
                    application.getName(),
                    application.getVersion() == null ? "" : "v" + application.getVersion() + " ",
                    name), e);
            String ex = e.toString();
            Throwable cause = e.getCause();
            while(cause != null) {
                ex += ";\n<br>" + cause.toString();
                cause = cause.getCause();
            }
            getContext().getValidationErrors().addGlobalError(new SimpleError("Fout bij kopieren applicatie: " + ex));
            return new ForwardResolution(JSP);
        }
    }
    
    public Resolution mashup(){
        ValidationErrors errors = context.getValidationErrors();
        try {
            Level root = application.getRoot();
            // Prevent copy-ing levels/layers
            application.setRoot(null);
            Application mashup = application.deepCopy();
            Stripersist.getEntityManager().detach(application);
            mashup.setRoot(root);
            mashup.getDetails().put(Application.DETAIL_IS_MASHUP, new ClobElement(Boolean.TRUE + ""));
            mashup.setName(mashup.getName() + "_" + mashupName);
            Stripersist.getEntityManager().persist(mashup);
            Stripersist.getEntityManager().getTransaction().commit();
            setApplication(mashup);
        } catch (Exception ex) {
                errors.add("Fout", new SimpleError("De mashup kan niet worden gemaakt."));
        }
        return new RedirectResolution(ApplicationSettingsActionBean.class);
    }
    
    public Resolution publish (){
        // Find current published application and make backup
        try {
            Application oldPublished = (Application)Stripersist.getEntityManager().createQuery("from Application where name = :name AND version IS null")
                .setMaxResults(1)
                .setParameter("name", name)
                .getSingleResult();
            
            Date nowDate = new Date(System.currentTimeMillis());
            SimpleDateFormat sdf = (SimpleDateFormat) SimpleDateFormat.getDateInstance();
            sdf.applyPattern("HH-mm_dd-MM-yyyy");
            String now = sdf.format(nowDate);
            String uniqueVersion = findUniqueVersion(name, "B_"+now );
            oldPublished.setVersion(uniqueVersion);
            Stripersist.getEntityManager().persist(oldPublished);
            Stripersist.getEntityManager().getTransaction().commit();
            
        } catch(NoResultException nre) {
        }
        application.setVersion(null);
        Stripersist.getEntityManager().persist(application);
        Stripersist.getEntityManager().getTransaction().commit();
        
        setApplication(null);
        
        return new RedirectResolution(ChooseApplicationActionBean.class);
    }
    
      /**
     * Checks if a Application with given name already exists and if needed
     * returns name with sequence number in brackets added to make it unique.
     * @param name Name to make unique
     * @return A unique name for a FeatureSource
     */
    public static String findUniqueVersion(String name, String version) {
        int uniqueCounter = 0;
        while(true) {
            String testVersion;
            if(uniqueCounter == 0) {
                testVersion = version;
            } else {
                testVersion = version + " (" + uniqueCounter + ")";
            }
            try {
                Stripersist.getEntityManager().createQuery("select 1 from Application where name = :name AND version = :version")
                    .setParameter("name", name)
                    .setParameter("version", testVersion)
                    .setMaxResults(1)
                    .getSingleResult();

                uniqueCounter++;
            } catch(NoResultException nre) {
                version = testVersion;
                break;
            }
        }  
        return version;
    }
}
