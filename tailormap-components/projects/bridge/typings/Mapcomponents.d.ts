import { LayerVisibilityEvent } from '../../core/src/lib/shared/models/event-models';
import { Geometry } from '../../core/src/lib/shared/generated';

declare interface App {
  id: number;
}

declare interface AppLoader {
  get: (varName: 'viewerController' | 'appId' | 'user' | 'contextPath' | 'absoluteURIPrefix') => any;
}

declare interface GeoService {
  id: string;
}

declare interface AppLayer {
  id: string;
  layerName: string;

  attribute: boolean;   // has attribute table???
  featureType: number;
}

type layerVisibilityEvent = (object: any, event: LayerVisibilityEvent) => void;
type layerEvent = (object: any, event: any) => void;

declare interface Map {
  addListener: (eventName: string, handler: layerVisibilityEvent) => void;
  getLayer: (id: string) => Layer;
  update: () => void;
  getResolution: () => number;
}

declare interface MapComponent {
  getMap: () => Map;
}

declare interface Layer {
  id: string;
  addListener: (eventName: string, handler: layerEvent, scope: any) => void;
  removeListener: (eventName: string, handler: layerEvent, scope: any) => void;
}

declare interface VectorLayer extends Layer {
  drawFeature: (geometryType: string) => void;
  readGeoJSON: (geojson: Geometry) => void;
  removeAllFeatures: () => void;
}
