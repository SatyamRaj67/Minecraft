struct LightingUBO {
    sunDirection: vec3<f32>,
    sunIntensity: f32,
    sunColor: vec3<f32>,
    ambientScale: f32,
    fogColor: vec3<f32>,
    fogDensity: f32,
    fogStart: f32,
    fogEnd: f32,
    _pad: vec2<f32>,
};