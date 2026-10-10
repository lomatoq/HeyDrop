import * as G from './geo-math.js';
import {clamp,mix,smooth} from './core.js';
const C=window.Cesium;
export const CARGO_RIG={radius:2.08,crown:6.19,skirt:5.125,halfHeight:.84};
export function dropDuration(s){return s.dropDuration||clamp(Math.sqrt(2*(s.dropStart||95)/80),1,3)}
// Camera composition is expressed as a physical chase offset in metres. The
// crate itself is always at its simulated height above the aimed ground point.
export function chaseOffset(s,width,height,fovy){
 const open=smooth(0,.9,clamp(s.chute)),mobile=width<650,focal=height/(2*Math.tan(fovy*.5));
 const box=Math.min(mobile?76:138,height*.16,width*.23);
 const wing=Math.min(mobile?width*.30:238,height*.29);
 const gap=mix(2.05*focal/box,CARGO_RIG.crown+2*CARGO_RIG.radius*focal/wing,open);
 const h=Math.max(20,s.phase==='land'?s.dropStart:s.h),parallax=(h+gap)/h;
 // Keep the load and canopy in the right/lower quarter; the ground aim is the
 // optical centre of BOTH renderers. These offsets move the camera, not models.
 return {x:-(width*.17)*gap/focal*parallax,y:gap,z:-(height*.075)*gap/focal*parallax,blend:1-smooth(1700,2600,h)};
}
// A small floating origin avoids putting six-million-metre ECEF positions in
// float32 meshes. +X is heading-right, +Y geodetic up, +Z heading-backward.
export class FlightFrame{
 constructor(){this.origin=new C.Cartesian3();this.right=new C.Cartesian3();this.up=new C.Cartesian3();this.back=new C.Cartesian3();this.forward=new C.Cartesian3();this.temp=new C.Cartesian3();this.ready=false;this.projection=new Array(16);this.pose={position:{},direction:{},up:{},right:{}};}
 set(aim,north){const geo=G.coord(aim);C.Cartesian3.fromDegrees(geo.lon,geo.lat,0,C.Ellipsoid.WGS84,this.origin);C.Ellipsoid.WGS84.geodeticSurfaceNormal(this.origin,this.up);this.forward.x=north[0];this.forward.y=north[1];this.forward.z=north[2];C.Cartesian3.multiplyByScalar(this.up,C.Cartesian3.dot(this.forward,this.up),this.temp);C.Cartesian3.subtract(this.forward,this.temp,this.forward);C.Cartesian3.normalize(this.forward,this.forward);C.Cartesian3.cross(this.forward,this.up,this.right);C.Cartesian3.normalize(this.right,this.right);C.Cartesian3.negate(this.forward,this.back);}
 vector(v,out={}){out.x=C.Cartesian3.dot(v,this.right);out.y=C.Cartesian3.dot(v,this.up);out.z=C.Cartesian3.dot(v,this.back);return out;}
 local(v,out={}){C.Cartesian3.subtract(v,this.origin,this.temp);return this.vector(this.temp,out);}
 world(x,y,z,out=new C.Cartesian3()){out.x=this.origin.x+this.right.x*x+this.up.x*y+this.back.x*z;out.y=this.origin.y+this.right.y*x+this.up.y*y+this.back.y*z;out.z=this.origin.z+this.right.z*x+this.up.z*y+this.back.z*z;return out;}
 capture(camera){this.local(camera.positionWC,this.pose.position);this.vector(camera.directionWC,this.pose.direction);this.vector(camera.upWC,this.pose.up);this.vector(camera.rightWC,this.pose.right);C.Matrix4.toArray(camera.frustum.projectionMatrix,this.projection);this.fovy=camera.frustum.fovy;this.ready=true;}
 projectLocal(scene,x,y,z){return C.SceneTransforms.worldToWindowCoordinates(scene,this.world(x,y,z));}
}
