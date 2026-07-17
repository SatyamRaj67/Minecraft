struct CameraUBO {
    view: mat4x4<f32>,
    proj: mat4x4<f32>,
    viewProj: mat4x4<f32>,
    invProj: mat4x4<f32>,
    position: vec3<f32>,
    time: f32,
    nearPlane: f32,
    farPlane: f32,
    _pad: vec2<f32>,
};