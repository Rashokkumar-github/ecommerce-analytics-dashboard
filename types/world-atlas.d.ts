declare module "world-atlas/countries-110m.json" {
  const data: {
    type: "Topology";
    objects: {
      countries: {
        type: "GeometryCollection";
        geometries: Array<{
          type: string;
          id: string;
          arcs: number[][][];
        }>;
      };
      land: { type: string; arcs: number[][][] };
    };
    arcs: number[][][];
    transform: { scale: [number, number]; translate: [number, number] };
  };
  export default data;
}
