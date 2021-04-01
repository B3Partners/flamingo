package nl.b3p.viewer;

import nl.b3p.viewer.config.services.GeoService;
import nl.b3p.viewer.config.services.UpdateResult;
import nl.b3p.viewer.config.services.WMSService;
import nl.b3p.web.WaitPageStatus;

import javax.persistence.EntityManager;
import java.util.Map;

public interface ServiceHelper {

    public GeoService loadServiceFromURL(String url, Map params, WaitPageStatus status, EntityManager em) throws Exception;
    public UpdateResult updateService(EntityManager em, GeoService service);
}
