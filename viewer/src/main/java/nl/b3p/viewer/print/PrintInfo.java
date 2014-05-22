<<<<<<< Updated upstream
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
package nl.b3p.viewer.print;

/**
 *
 * @author Roy Braam
 */
import java.awt.Dimension;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlElementWrapper;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlType;
import org.apache.commons.io.IOUtils;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

@XmlRootElement(name="info")
@XmlType(propOrder = {"title","subtitle","date","imageUrl","legendUrls","bbox","remark","quality","angle","overviewUrl"})
public class PrintInfo {
    private static final Log log = LogFactory.getLog(PrintInfo.class);
    
    private String title;
    private String subtitle;
    private String date;
    private String imageUrl;
    private String bbox;
    private String remark;
    private int quality;
    private int angle;
    private List<Legend> legendUrls = new ArrayList();
    
    private List<File> tempFiles = new ArrayList();
    
    private String overviewUrl;
    
    public PrintInfo() {
    }    

    @XmlElement(name="title")
    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    @XmlElement(name="date")
    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    @XmlElement(name="imageUrl")
    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    @XmlElement(name="bbox")
    public String getBbox() {
        return bbox;
    }

    public void setBbox(String bbox) {
        this.bbox = bbox;
    }

    @XmlElement(name="remark")
    public String getRemark() {
        return remark;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    @XmlElement(name="quality")
    public int getQuality() {
        return quality;
    }

    public void setQuality(int quality) {
        this.quality = quality;
    }
    @XmlElement(name="subtitle")
    public String getSubtitle() {
        return subtitle;
    }
    
    public void setSubtitle(String subtitle) {
        this.subtitle = subtitle;
    }

    public void setLegendUrls(List<Legend> legendUrls) {
        this.legendUrls=legendUrls;
    }
    
    @XmlElementWrapper(name="legendUrls")
    @XmlElement(name="legendUrl")
    public List<Legend> getLegendUrls(){
        return this.legendUrls;
    }

    @XmlElement(name="angle")
    public int getAngle() {
        return angle;
    }

    public void setAngle(int angle) {
        this.angle = angle;
    }

    @XmlElement(name="overviewUrl")
    public String getOverviewUrl() {
        return overviewUrl;
    }

    public void setOverviewUrl(String overviewUrl) {
        this.overviewUrl = overviewUrl;
    }
    
    public void cacheLegendImagesAndReadDimensions() {
        for(Legend l: legendUrls) {
            for(LegendPart lp: l.getLegendParts()) {
                File legendFile = null;
                InputStream in = null;
                ByteArrayOutputStream legendMemoryCache = new ByteArrayOutputStream();
                FileOutputStream fos = null;
                try {
                    log.debug("Loading legend from URL: " + lp.getUrl());
                    URL u = new URL(lp.getUrl());
                    in = u.openStream();
                    IOUtils.copy(in, legendMemoryCache);
                    
                    legendFile = File.createTempFile("legend_img_", null);
                    tempFiles.add(legendFile);
                    legendFile.deleteOnExit();
                    fos = new FileOutputStream(legendFile);
                    IOUtils.copy(new ByteArrayInputStream(legendMemoryCache.toByteArray()), fos);
                    fos.flush();
                    lp.setUrl(legendFile.toURI().toString());
                    log.debug("Legend part url changed to point to temporary file: " + lp.getUrl());
                    
                    Dimension dim = getImageDimension(new ByteArrayInputStream(legendMemoryCache.toByteArray()));
                    if(dim == null) {
                        log.debug("No dimensions could be determined");
                    } else {
                        lp.setWidth((int)dim.getWidth());
                        lp.setHeight((int)dim.getHeight());
                        log.debug(String.format("Dimensions: %d x %d", lp.getWidth(), lp.getHeight()));
                    }
                    
                } catch(Exception e) {
                    log.warn("Exception loading legend dimensions from URL " + lp.getUrl(), e);
                } finally {
                    if(in != null) {
                        try {
                            in.close();
                        } catch (IOException ex) {
                        }
                    }
                    if(fos != null) {
                        try {
                            fos.close();
                        } catch (IOException ex) {
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Load image dimensions, ideally without decoding the entire image.
     */
    private static Dimension getImageDimension(InputStream image) throws IOException {
        // http://stackoverflow.com/questions/1559253/java-imageio-getting-image-dimension-without-reading-the-entire-file
        
        ImageInputStream in = ImageIO.createImageInputStream(image);
        try {
            final Iterator<ImageReader> readers = ImageIO.getImageReaders(in);
            if(readers.hasNext()) {
                ImageReader reader = readers.next();
                try {
                    reader.setInput(in);
                    return new Dimension(reader.getWidth(0), reader.getHeight(0));
                } finally {
                    reader.dispose();
                }
            }
        } finally {
            if(in != null) {
                in.close();
            }
        }
        return null;
    }
    
    public void removeLegendImagesCache() {
        for(File tempFile: tempFiles) {
            try {
                tempFile.delete();
                log.debug("Temporary file deleted: " + tempFile.getCanonicalPath());
            } catch(Exception e) {
                try {
                    log.error("Error deleting temporary file " + tempFile.getCanonicalPath(), e);
                } catch(IOException ex) {
                }
            }
        }
    }    
}
=======
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
/* Modified: 2014, Eddy Scheper ARIS B.V.
 *           - Support for extra info added.
*/
package nl.b3p.viewer.print;

/**
 *
 * @author Roy Braam
 */
import java.awt.Dimension;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlElementWrapper;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlType;
import org.apache.commons.io.IOUtils;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import javax.xml.bind.annotation.XmlAnyElement;


@XmlRootElement(name="info")
// 2014, Eddy Scheper, ARIS B.V. - Modified.
//@XmlType(propOrder = {"title","subtitle","date","imageUrl","legendUrls","bbox","remark","quality","angle","overviewUrl"})
@XmlType(propOrder = {"title","subtitle","date","imageUrl","legendUrls","bbox","remark","quality","angle","overviewUrl","extra"})
public class PrintInfo {
    private static final Log log = LogFactory.getLog(PrintInfo.class);
    
    private String title;
    private String subtitle;
    private String date;
    private String imageUrl;
    private String bbox;
    private String remark;
    private int quality;
    private int angle;
    // 2014, Eddy Scheper, ARIS B.V. - Added.
    private List<String> extra = new ArrayList();
    private List<Legend> legendUrls = new ArrayList();
    
    private List<File> tempFiles = new ArrayList();
    
    private String overviewUrl;
    
    public PrintInfo() {
    }    

    @XmlElement(name="title")
    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    @XmlElement(name="date")
    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    @XmlElement(name="imageUrl")
    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    @XmlElement(name="bbox")
    public String getBbox() {
        return bbox;
    }

    public void setBbox(String bbox) {
        this.bbox = bbox;
    }

    @XmlElement(name="remark")
    public String getRemark() {
        return remark;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    @XmlElement(name="quality")
    public int getQuality() {
        return quality;
    }

    public void setQuality(int quality) {
        this.quality = quality;
    }
    @XmlElement(name="subtitle")
    public String getSubtitle() {
        return subtitle;
    }
    
    public void setSubtitle(String subtitle) {
        this.subtitle = subtitle;
    }

    public void setLegendUrls(List<Legend> legendUrls) {
        this.legendUrls=legendUrls;
    }
    
    @XmlElementWrapper(name="legendUrls")
    @XmlElement(name="legendUrl")
    public List<Legend> getLegendUrls(){
        return this.legendUrls;
    }

    @XmlElement(name="angle")
    public int getAngle() {
        return angle;
    }

    public void setAngle(int angle) {
        this.angle = angle;
    }

    @XmlElement(name="overviewUrl")
    public String getOverviewUrl() {
        return overviewUrl;
    }

    public void setOverviewUrl(String overviewUrl) {
        this.overviewUrl = overviewUrl;
    }

    // 2014, Eddy Scheper, ARIS B.V. - Added.
    @XmlAnyElement
    public List<String> getExtra() {
        return extra;
    }

    // 2014, Eddy Scheper, ARIS B.V. - Added.
    public void setExtra(List<String> extra) {
        this.extra = extra;
    }

    public void cacheLegendImagesAndReadDimensions() {
        for(Legend l: legendUrls) {
            for(LegendPart lp: l.getLegendParts()) {
                File legendFile = null;
                InputStream in = null;
                ByteArrayOutputStream legendMemoryCache = new ByteArrayOutputStream();
                FileOutputStream fos = null;
                try {
                    log.debug("Loading legend from URL: " + lp.getUrl());
                    URL u = new URL(lp.getUrl());
                    in = u.openStream();
                    IOUtils.copy(in, legendMemoryCache);
                    
                    legendFile = File.createTempFile("legend_img_", null);
                    tempFiles.add(legendFile);
                    legendFile.deleteOnExit();
                    fos = new FileOutputStream(legendFile);
                    IOUtils.copy(new ByteArrayInputStream(legendMemoryCache.toByteArray()), fos);
                    fos.flush();
                    lp.setUrl(legendFile.toURI().toString());
                    log.debug("Legend part url changed to point to temporary file: " + lp.getUrl());
                    
                    Dimension dim = getImageDimension(new ByteArrayInputStream(legendMemoryCache.toByteArray()));
                    if(dim == null) {
                        log.debug("No dimensions could be determined");
                    } else {
                        lp.setWidth((int)dim.getWidth());
                        lp.setHeight((int)dim.getHeight());
                        log.debug(String.format("Dimensions: %d x %d", lp.getWidth(), lp.getHeight()));
                    }
                    
                } catch(Exception e) {
                    log.warn("Exception loading legend dimensions from URL " + lp.getUrl(), e);
                } finally {
                    if(in != null) {
                        try {
                            in.close();
                        } catch (IOException ex) {
                        }
                    }
                    if(fos != null) {
                        try {
                            fos.close();
                        } catch (IOException ex) {
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Load image dimensions, ideally without decoding the entire image.
     */
    private static Dimension getImageDimension(InputStream image) throws IOException {
        // http://stackoverflow.com/questions/1559253/java-imageio-getting-image-dimension-without-reading-the-entire-file
        
        ImageInputStream in = ImageIO.createImageInputStream(image);
        try {
            final Iterator<ImageReader> readers = ImageIO.getImageReaders(in);
            if(readers.hasNext()) {
                ImageReader reader = readers.next();
                try {
                    reader.setInput(in);
                    return new Dimension(reader.getWidth(0), reader.getHeight(0));
                } finally {
                    reader.dispose();
                }
            }
        } finally {
            if(in != null) {
                in.close();
            }
        }
        return null;
    }
    
    public void removeLegendImagesCache() {
        for(File tempFile: tempFiles) {
            try {
                tempFile.delete();
                log.debug("Temporary file deleted: " + tempFile.getCanonicalPath());
            } catch(Exception e) {
                try {
                    log.error("Error deleting temporary file " + tempFile.getCanonicalPath(), e);
                } catch(IOException ex) {
                }
            }
        }
    }    
}
>>>>>>> Stashed changes
