export class Material {
    public roughness: any;
    public metallic: any;

    public constructor(roughness: any = .5, metallic: any = .5) {
        this.roughness = roughness;
        this.metallic = metallic;
    }
}