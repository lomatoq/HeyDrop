export {ImageryCache} from "./tile-cache.js";
export class MipProvider {
 constructor(source,cache,parent){this.source=source;this.cache=cache;this.parent=parent;for(const name of ['minimumLevel','maximumLevel','rectangle','tilingScheme','tileWidth','tileHeight','credit','errorEvent','tileDiscardPolicy'])this[name]=source[name];this.hasAlphaChannel=true;}
 requestImage(x,y,z){return this.parent?this.cache.parent(x,y,z):this.cache.request(x,y,z,6);}
 getTileCredits(x,y,z){return this.source.getTileCredits?.(x,y,z)}
 pickFeatures(){return undefined}
}
