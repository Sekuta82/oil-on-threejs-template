import {
    RawShaderMaterial,
    UniformsUtils,
    UniformsLib,
    TextureLoader,
} from './three.module.js'

var Shaders = {};

var phong_struct = `
    struct DirectionalLight {
        vec3 direction;
        vec3 color;
    };
    struct GeometricContext {
        vec3 position;
        vec3 normal;
        vec3 viewDir;
    };
    struct IncidentLight {
        vec3 color;
        vec3 direction;
        bool visible;
    };
    struct ReflectedLight {
        vec3 directDiffuse;
    };
    `;

var phong_frag = `
    #define RECIPROCAL_PI 0.31830988618
    #define saturate(a) clamp( a, 0.0, 1.0 )
    uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
    void getDirectionalDirectLightIrradiance( const in DirectionalLight directionalLight, const in GeometricContext geometry, out IncidentLight directLight ) {
        directLight.color = directionalLight.color;
        directLight.direction = directionalLight.direction;
        directLight.visible = true;
    }
    float G_BlinnPhong_Implicit( /* const in float dotNL, const in float dotNV */ ) {
        return 0.25;
    }
    void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in GeometricContext geometry, inout ReflectedLight reflectedLight ) {
        float dotNL = saturate( dot( geometry.normal, directLight.direction ) );
        vec3 irradiance = dotNL * directLight.color;
        reflectedLight.directDiffuse = irradiance;
    }
  `;


function brushMaterial() {
    var material = new RawShaderMaterial({
        lights: true,
        vertexColors: true,
        uniforms: UniformsUtils.merge([
            UniformsLib["lights"],
            {
                "brushMap": { value: new TextureLoader() },
                "stencilMap": { value: new TextureLoader() },
                "patternMap": { value: new TextureLoader() },
                "size": { value: 1.0 },
                "atlas_columns": { value: 4.0 },
                "atlas_rows": { value: 4.0 },
                "normal_strength": { value: 0.2 },
                "time": { value: 0.0 }
            },
        ]),
        vertexShader: [
            `precision highp float;
            attribute vec3 position;
            attribute vec3 normal;
            attribute vec2 uv;
            attribute vec3 color;
            uniform float size;
            uniform vec3 cameraPosition;
            uniform mat4 modelMatrix;
            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
            uniform float time;
            varying highp vec3 vViewPosition;
            varying highp vec3 vNormal;
            varying highp vec3 vColor;
            varying highp float vFresnel;
            uniform float atlas_columns;
            uniform float atlas_rows;
            varying float atlas_index;
            varying vec2 atlas_index_transition;
            varying mat2 rotation_matrix;
            
            mat2 rotate2d(float angle){
                return mat2(cos(angle),-sin(angle),
                   sin(angle),cos(angle));
            }
            float rand(vec2 co){
                return sin(dot(co, vec2(12.9898, 78.233)));
            }
            void main() {
                vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
                vec3 cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
                vec3 worldNormal = normalize ( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );
                vFresnel = dot( cameraToVertex, worldNormal ) * -1.0;
                if (vFresnel < -0.8) return; // discard backfaces

                float scaled_time = time * 0.05;
                vColor = color;
                float tiles = atlas_columns * atlas_rows;
                // ugly random function
                float random_index = mod(((uv.x + uv.y + rand(vec2(uv.x, vColor.r))*10.0 + normal.x + normal.y + vColor.r + vColor.g + vFresnel + (scaled_time + (uv.x + uv.y) * 0.1)) * tiles), tiles);
                // index transition animation
                atlas_index_transition.x = smoothstep(0.0, 0.5, fract(random_index)); // in
                atlas_index_transition.y = smoothstep(1.0, 0.9, fract(random_index)); // out
                random_index = floor(random_index);
                float random_index_normalized = sin(random_index/tiles);
                vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

				gl_PointSize = size * ( mix(40.0, 60.0, vFresnel * vFresnel) / - mvPosition.z );

				gl_Position = projectionMatrix * mvPosition;
                
                vViewPosition = -mvPosition.xyz;
                vNormal = normal;
                atlas_index = random_index + 0.01;
                
                // rotation angle
                float random_rotation = (uv.x + uv.y + normal.x + normal.y + vColor.r + vColor.g);
                float angle = random_rotation * 5.0 + rand(vec2(random_index_normalized, floor(scaled_time + random_index_normalized)));
                rotation_matrix = rotate2d(angle);
            }`
        ].join("\n"),
        fragmentShader: [
            `precision highp float;
            `+ phong_struct + `
            
            uniform sampler2D brushMap;
            uniform sampler2D stencilMap;
            uniform sampler2D patternMap;
            uniform float atlas_columns;
            uniform float atlas_rows;
            uniform mat3 normalMatrix;
            uniform float normal_strength;
            varying float atlas_index;
            varying vec2 atlas_index_transition;
            varying highp vec3 vViewPosition;
            varying highp vec3 vNormal;
            varying highp vec3 vColor;
            varying highp float vFresnel;
            varying mat2 rotation_matrix;

            `+ phong_frag + `
            
            void main( void ) {
                if (vFresnel < -0.8) return; // discard backfaces

                vec2 uv = vec2( gl_PointCoord.x, 1.0 - gl_PointCoord.y );

                vec2 rotatedUV = uv - vec2(0.5, 0.5); //move rotation center to center of object
                rotatedUV = rotation_matrix * rotatedUV;
                rotatedUV += vec2(0.5, 0.5); // move uv back to origin

                // atlas uv
                vec2 atlasPos = rotatedUV;
                vec2 atlasSteps = vec2((1.0 / atlas_columns),(1.0 / atlas_rows));
                atlasPos.x = (atlasPos.x / atlas_columns) + (atlasSteps.x * mod(atlas_index,atlas_columns));
                atlasPos.y = (atlasPos.y / atlas_rows) + (atlasSteps.y * (atlas_rows - 1.0)) - (atlasSteps.y * floor((atlas_index) / atlas_columns));

                vec4 color_brush = texture2D(brushMap,atlasPos);
                float stencil = texture2D(stencilMap,uv).r;
                
                float pattern = texture2D(patternMap,vec2(mod(gl_FragCoord.x, 8.0) / 8.0, mod(gl_FragCoord.y, 8.0) / 8.0)).r;
                float dither = color_brush.a * pattern * stencil;
                dither *= step(rotatedUV.x, atlas_index_transition.x) * atlas_index_transition.y;
                if (dither < 0.1) discard;

                vec3 mapN = color_brush.rgb * 2.0 - 1.0;
                mapN *= normal_strength;

                ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ) );
                GeometricContext geometry;
                geometry.position = - vViewPosition;
                geometry.normal = normalMatrix * mapN;
                geometry.viewDir = normalize( vViewPosition );
                IncidentLight directLight;
                DirectionalLight directionalLight;
                
                #pragma unroll_loop_start
                for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
                    directionalLight = directionalLights[ i ];
                    getDirectionalDirectLightIrradiance( directionalLight, geometry, directLight );
                    RE_Direct_BlinnPhong( directLight, geometry, reflectedLight );
                }
                #pragma unroll_loop_end

                float height = dot(normalize(vViewPosition), mapN);
                vec3 finalColor = vColor;
                finalColor += reflectedLight.directDiffuse;

                gl_FragColor = vec4(finalColor, 1.0 );
            }`
        ].join("\n")
    });

    return material;
}
Shaders.brushMaterial = brushMaterial();

export { Shaders }
