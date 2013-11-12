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
package nl.b3p.viewer.stripes;

import java.io.IOException;
import java.io.StringReader;
import java.math.BigInteger;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.xml.bind.JAXBException;
import net.sourceforge.stripes.action.*;
import net.sourceforge.stripes.validation.Validate;
import nl.b3p.csw.client.CswClient;
import static nl.b3p.csw.client.CswRequestCreator.createCswRequest;
import static nl.b3p.csw.client.CswRequestCreator.createPropertyName;
import static nl.b3p.csw.client.CswRequestCreator.createQueryString;
import nl.b3p.csw.client.FilterCreator;
import nl.b3p.csw.client.InputBySearch;
import nl.b3p.csw.client.OutputBySearch;
import nl.b3p.csw.client.OwsException;
import nl.b3p.csw.jaxb.csw.GetRecords;
import nl.b3p.csw.jaxb.filter.And;
import nl.b3p.csw.jaxb.filter.BinaryLogicOpType;
import nl.b3p.csw.jaxb.filter.FilterType;
import nl.b3p.csw.jaxb.filter.Or;
import nl.b3p.csw.jaxb.filter.PropertyIsEqualTo;
import nl.b3p.csw.jaxb.filter.PropertyIsLike;
import nl.b3p.csw.jaxb.filter.SortBy;
import nl.b3p.csw.server.CswServable;
import nl.b3p.csw.server.GeoNetworkCswServer;
import nl.b3p.csw.util.OnlineResource;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.apache.lucene.analysis.Token;
import org.apache.lucene.analysis.TokenStream;
import org.apache.lucene.analysis.nl.DutchAnalyzer;
import org.apache.lucene.analysis.standard.StandardAnalyzer;
import org.jdom.JDOMException;

import org.json.*;

/**
 *
 * @author Matthijs Laan
 * @author Meine Toonen
 */
@UrlBinding("/action/csw/search")
@StrictBinding
public class CatalogSearchActionBean implements ActionBean {
    
    private ActionBeanContext context;
    private static final Log log = LogFactory.getLog(CatalogSearchActionBean.class);
    private static final String defaultWildCard = "*";
    
    private BigInteger maxRecords = new BigInteger("1000");
    
    @Validate
    private String url;
    
    @Validate
    private String q;
    
    @Validate
    private String advancedString;
    
    @Validate
    private String advancedProperty;
    

    //<editor-fold defaultstate="collapsed" desc="getters and setters">
    public ActionBeanContext getContext() {
        return context;
    }
    
    public void setContext(ActionBeanContext context) {
        this.context = context;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getQ() {
        return q;
    }

    public void setQ(String q) {
        this.q = q;
    }

    public String getAdvancedString() {
        return advancedString;
    }

    public void setAdvancedString(String advancedString) {
        this.advancedString = advancedString;
    }

    public String getAdvancedProperty() {
        return advancedProperty;
    }

    public void setAdvancedProperty(String advancedProperty) {
        this.advancedProperty = advancedProperty;
    }
    //</editor-fold>        
    
    @DefaultHandler
    public Resolution search() throws JSONException {    
        JSONObject json = new JSONObject();
        json.put("success", Boolean.FALSE);
        String error = null;
    
        try {
            CswServable server = new GeoNetworkCswServer(null,
                    url,
                    null, 
                    null
            );        
            
            CswClient client = new CswClient(server);
            InputBySearch input = new InputBySearch(q);
            OutputBySearch output = client.search(input);            

            Map<URI, List<OnlineResource>> map = output.getResourcesMap();
            JSONArray results = getResults(map, output);

            json.put("results", results);                

            json.put("success", Boolean.TRUE);
        } catch(Exception e) {

            error = "Fout bij zoeken in CSW: " + e.toString();
            log.error("Fout bij zoeken in csw:",e);
            if(e.getCause() != null) {
                error += "; oorzaak: " + e.getCause().toString();
            }
        }
                
        if(error != null) {
            json.put("error", error);
        }
        
        return new StreamingResolution("application/json", new StringReader(json.toString(4)));               
    }

    public Resolution advancedSearch() throws JSONException {
        JSONObject json = new JSONObject();
        json.put("success", Boolean.FALSE);
        CswServable server = new GeoNetworkCswServer(null, url, null, null);
        CswClient client = new CswClient(server);
        try {
            //  OutputBySearch output = client.search(new InputBySearch(CswSmartRequestCreatorWebkaart.createSmartCswRequest(searchString, typeringString, "", null, maxRecords, null)));
              OutputBySearch output = client.search(new InputBySearch(
                      createAdvancedCswRequest(//url, url, url, BigInteger.ZERO, BigInteger.ZERO, null
                      q, advancedString, advancedProperty, null, maxRecords, null)));
            Map<URI, List<OnlineResource>> map = output.getResourcesMap();
            JSONArray results = getResults(map, output);
              
            json.put("results", results);                

            json.put("success", Boolean.TRUE);
        } catch (IOException ex) {
            log.error("Fout bij zoeken in csw:",ex);
        } catch (JDOMException ex) {
            log.error("Fout bij zoeken in csw:",ex);
        } catch (JAXBException ex) {
            log.error("Fout bij zoeken in csw:",ex);
        } catch (OwsException ex) {
            log.error("Fout bij zoeken in csw:",ex);
        }
           
        return new StreamingResolution("application/json", new StringReader(json.toString(4)));
    }
    
    private JSONArray getResults(Map<URI, List<OnlineResource>> map, OutputBySearch output ) throws JDOMException, JSONException{
        JSONArray results = new JSONArray();
        for (List<OnlineResource> resourceList : map.values()) {
            for (OnlineResource resource : resourceList) {

                String title = output.getTitle(resource.getMetadata());
                String rurl = resource.getUrl() != null ? resource.getUrl().toString() : null;
                String layer = resource.getName();
                String protocol = resource.getProtocol() != null ? resource.getProtocol().getName() : null;

                if (title != null && rurl != null && protocol != null) {
                    if (protocol.toLowerCase().indexOf("wms") != -1) {
                        JSONObject result = new JSONObject();
                        result.put("label", title + (layer != null ? " (laag: " + layer + ")" : ""));
                        result.put("url", rurl);
                        result.put("protocol", "wms");
                        results.put(result);
                    }
                }
            }
        }
        return results;
    }

    public static GetRecords createAdvancedCswRequest(
            String queryString, String typering,
            String propertyName,
            BigInteger startPosition,
            BigInteger maxRecords,
            SortBy sortBy) {

        FilterType filterType = new FilterType();
        boolean emptySearchStrings = true;
        
        List andList = new ArrayList();
        Or queryOr = null;
        Or typeringOr = null;
        
        if(queryString != null){
            emptySearchStrings = false;
            queryOr = createOrFilter(queryString, null);
            andList.add(queryOr);
        }
        if(typering != null){
            emptySearchStrings = false;
            
            PropertyIsEqualTo propertyIsEqualTo = FilterCreator.createPropertyIsEqualTo(typering, propertyName);
            List orList = new ArrayList();
            orList.add(propertyIsEqualTo);          
            typeringOr = new Or(new BinaryLogicOpType(orList));
            
            andList.add(propertyIsEqualTo);
        }

        if (emptySearchStrings) {
            return createCswRequest("*", propertyName, startPosition, maxRecords, sortBy, null, null, null);
        }

        And and = new And(new BinaryLogicOpType(andList));

        if(queryOr != null && typeringOr != null){
            filterType.setLogicOps(and);
        }else if(queryOr != null){
            filterType.setLogicOps(queryOr);
        }else if(typeringOr != null){
            filterType.setLogicOps(typeringOr);
        }

        return createCswRequest(filterType, startPosition, maxRecords, sortBy);
    }
    
    
    private static Or createOrFilter(String queryString, String propertyName){
        
        List orList = new ArrayList();
        BinaryLogicOpType binaryLogicOpType = new BinaryLogicOpType();

        queryString = createQueryString(queryString, false);
        if (queryString != null && !queryString.trim().equals(defaultWildCard)) {

            propertyName = createPropertyName(propertyName);

            PropertyIsEqualTo propertyIsEqualTo = FilterCreator.createPropertyIsEqualTo(queryString, propertyName);

            StandardAnalyzer standardAnalyzer = new StandardAnalyzer(DutchAnalyzer.DUTCH_STOP_WORDS);
            TokenStream tokenStream = standardAnalyzer.tokenStream("", new StringReader(queryString));

            orList.add(propertyIsEqualTo);
            try {
                Token token = null;
                while ((token = tokenStream.next()) != null) {
                    String tokenString = new String(token.termBuffer()).trim();
                    log.debug("term: " + tokenString);
                    PropertyIsLike propertyIsLike = FilterCreator.createPropertyIsLike(tokenString, propertyName);
                    orList.add(propertyIsLike);
                }
            } catch (IOException e) {
                PropertyIsLike propertyIsLike = FilterCreator.createPropertyIsLike(queryString, propertyName);
                orList.add(propertyIsLike);
            }
        }
        
        Or or = new Or(new BinaryLogicOpType(orList));
                
        return or;
    }
}
