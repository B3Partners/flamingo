// Parameters as defined in viewer/src/main/java/nl.viewer/stripes/DownloadFeaturesActionBean

export interface ExportFeaturesParameters {
  application: number;
  appLayer: number;
  columns: string[];
  type: string; // Export type (SHP, XLS, etc)
  featureType?: number;
  debug?: boolean;
  params?: string; // Other parameters (filter etc?)
}
