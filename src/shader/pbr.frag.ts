export default `
#define LIGHT_COUNT 4
#define PI 3.14159265359
#define RECIPROCAL_PI 0.31830988618
#define RECIPROCAL_PI2 0.15915494

precision highp float;

out vec4 outFragColor;
in vec3 vertexPosition;
in vec3 vNormalWS;

uniform vec3 cameraPosition;
uniform sampler2D d_texture;

struct Material
{
    vec3 albedo;
    float roughness;
    float metallic;
};

uniform Material uMaterial;

struct PointLight
{
    vec3 positionWS;
    vec3 color;
    float intensity;
};

uniform PointLight light[LIGHT_COUNT];

// From three.js
vec4 sRGBToLinear( in vec4 value ) {
    return vec4(mix(pow(value.rgb * 0.9478672986 + vec3(0.0521327014), vec3(2.4) ), value.rgb * 0.0773993808, vec3(lessThanEqual(value.rgb, vec3(0.04045)))), value.a);
}

// From three.js
vec4 LinearTosRGB( in vec4 value ) {
    return vec4(mix(pow(value.rgb, vec3(0.41666)) * 1.055 - vec3(0.055), value.rgb * 12.92, vec3(lessThanEqual(value.rgb, vec3(0.0031308)))), value.a);
}

vec3 RGBMToLinear( in vec4 value ) {
  return 6.0 * value.rgb * value.a;
}

vec3 FresnelSchlick(float cosTheta, vec3 F0)
{
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

float DistributionGGX(vec3 normal, vec3 halfVector, float roughness)
{
    float a = roughness * roughness;
    float NdotH = max(dot(normal, halfVector), 0.0);
    float denom = (NdotH * NdotH * (a * a - 1.0) + 1.0);
    return (a * a) / (PI * denom * denom);
}

float GeometrySchlickGGX(vec3 normal, vec3 view, float roughness, float k)
{
    float NdotV = max(dot(normal, view), 0.0);
    return NdotV / (NdotV * (1.0 - k) + k);
}

// From teacher
vec2 cartesianToPolar(vec3 n) {
    vec2 uv;
    uv.x = atan(n.z, n.x) * RECIPROCAL_PI2 + 0.5;
    uv.y = asin(n.y) * RECIPROCAL_PI + 0.5;
    return uv;
}

void main()
{
    // **DO NOT** forget to do all your computation in linear space.
    vec3 albedo = sRGBToLinear(vec4(uMaterial.albedo, 1)).rgb;
    float roughness = uMaterial.roughness;
    float metallic = uMaterial.metallic;
    vec3 normal = normalize(vNormalWS);
    vec3 view = normalize(cameraPosition - vertexPosition);

    vec3 Lo = vec3(0, 0, 0);
    // Iteration over lights
    for (int i = 0; i < LIGHT_COUNT; ++i) {
        vec3 lightPos = light[i].positionWS;
        vec3 lightCol = light[i].color;
        float lightIntensity = light[i].intensity;

        vec3 light = normalize(lightPos - vertexPosition);
        vec3 halfVector = normalize(light + view);

        float dist = length(lightPos - vertexPosition);
        float att = 1.0 / (dist * dist);
        vec3 rad = lightCol * att;

        float D = DistributionGGX(normal, halfVector, roughness);
        vec3 F = FresnelSchlick(max(dot(halfVector, view), 0.0), mix(vec3(0.04), albedo, metallic));
        float G = GeometrySchlickGGX(normal, view, roughness, (roughness * roughness) / 2.0) *
            GeometrySchlickGGX(normal, light, roughness, (roughness * roughness) / 2.0);

        // We add 1e-6 to avoid division by zero.
        vec3 specular = D * F * G /
            (4.0 * max(dot(normal, view), 0.0) * max(dot(normal, light), 0.0) + 1e-6);

        vec3 ks = F;
        vec3 kd = (1.0 - ks) * (1.0 - metallic) * albedo;
        Lo += (kd + ks * specular) * rad * max(dot(normal, light), 0.0);
        // vec3 diffuseBRDF = kd * RGBMToLinear(texture(d_texture, cartesianToPolar(normal)));
        // Lo += (diffuseBRDF + ks * specular) * rad * max(dot(normal, light), 0.0);
    }

    vec3 color = Lo;
    color /= (color + vec3(1.0));
    color = pow(color, vec3(0.5));

    outFragColor.rgba = LinearTosRGB(vec4(color, 1.0));
}
`;
