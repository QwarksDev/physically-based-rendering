import { Geometry } from "./geometries/geometry";
import { Transform } from "./transform";
import { Material } from "./textures/material";

export class GameObject {
    public geometry: Geometry;
    public transform: Transform;
    public material: Material;

    public constructor(geometry: Geometry, transform: Transform = new Transform(), material: Material = new Material()) {
        this.geometry = geometry;
        this.transform = transform;
        this.material = material;
    }
}