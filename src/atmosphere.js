// A single bounded post-process: six cloud samples, two noise octaves, no extra renderer.
// Rays use Cesium's actual world-space camera basis. Cloud positions remain fixed on Earth.
export const atmosphereShader=`
uniform sampler2D colorTexture;
in vec2 v_textureCoordinates;
uniform float uTime,uAlt,uAspect,uTan,uNight,uWarm,uCloud,uFog,uSpeed,uMotion,uActive;
uniform vec3 uCamera,uForward,uRight,uUp;
float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
// Units are kilometres to keep the ellipsoid quadratic well-conditioned in float32.
float shellHit(vec3 ray,float altitude){vec3 radii=vec3(6378.137,6378.137,6356.752314)+altitude;
 vec3 o=uCamera/radii,d=ray/radii;float a=dot(d,d),b=dot(o,d),disc=b*b-a*(dot(o,o)-1.);
 if(disc<0.)return -1.;return (-b-sqrt(disc))/a;}
float lum(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
void main(){
 vec2 uv=v_textureCoordinates,p=uv*2.-1.,px=1./vec2(textureSize(colorTexture,0));
 vec3 source=texture(colorTexture,uv).rgb,c=source;
 vec3 ray=normalize(uForward+uRight*p.x*uAspect*uTan+uUp*p.y*uTan);
 float ground=shellHit(ray,0.);
 if(uNight>.5&&uAlt<180000.&&ground>0.){
  // Graphic interpretation of daytime structure, NOT an observed city-light dataset.
  float l=lum(source),near=1.-smoothstep(20000.,180000.,uAlt);
  vec3 a=texture(colorTexture,uv+vec2(px.x*2.,0)).rgb,b=texture(colorTexture,uv-vec2(px.x*2.,0)).rgb;
  vec3 d=texture(colorTexture,uv+vec2(0,px.y*2.)).rgb,e=texture(colorTexture,uv-vec2(0,px.y*2.)).rgb;
  float edge=abs(lum(a)-lum(b))+abs(lum(d)-lum(e));
  float chroma=max(source.r,max(source.g,source.b))-min(source.r,min(source.g,source.b));
  float neutral=1.-smoothstep(.09,.23,chroma);
  float land=1.-smoothstep(.0,.065,source.b-source.r);
  float lights=smoothstep(.12,.36,edge)*smoothstep(.38,.75,l)*neutral*land;
  vec3 blue=vec3(.023,.043,.095)+source*vec3(.23,.28,.40);
  c=mix(source,blue+vec3(1.,.60,.21)*lights*.30,near);
 }
 if(uActive>.5&&uAlt<130000.&&ground>0.){
  vec3 fog=mix(vec3(.79,.86,.94),vec3(.085,.13,.23),uNight);
  fog=mix(fog,vec3(.94,.75,.62),uWarm*.32);
  if(uAlt>2000.&&uCloud>.10){
   float start=max(0.,shellHit(ray,3.5)),end=shellHit(ray,2.0),density=0.,lit=0.;
   if(end>start){for(int i=0;i<6;i++){
    float f=(float(i)+.5)/6.,t=mix(start,end,f);
    vec3 pos=uCamera+ray*t,field=pos*.48+vec3(uTime*.006,0.,uTime*.003);
    float n=noise(field)*.72+noise(field*2.03)*.28;
    float shell=sin(f*3.14159265),sampleDensity=max(0.,n-(.76-uCloud*.46))*shell;
    density+=sampleDensity;lit+=sampleDensity*(1.-f);
   }}
   float alpha=1.-exp(-density*1.8*clamp((end-start)/1.5,0.,2.));
   c=mix(c,fog*(.89+min(.2,lit*.3)),alpha);
  }
  // A low layer with finite optical depth; remains navigable underneath the deck.
  float fogPath=min(ground,1.1),mist=(1.-exp(-fogPath*uFog*1.3));
  c=mix(c,fog,mist*(1.-smoothstep(70000.,130000.,uAlt)));
 }
 float edge=smoothstep(.4,1.3,length(p));
 // Peripheral speed shading preserves geographic detail and the aim point.
 c*=1.-edge*(.035+uActive*uMotion*uSpeed*.045);
 out_FragColor=vec4(c,1.);
}`;
