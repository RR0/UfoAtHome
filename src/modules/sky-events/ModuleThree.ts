import {
  AdditiveBlending, BackSide, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, Color, ConeGeometry, CylinderGeometry, DataTexture,
  DoubleSide, Euler, Float32BufferAttribute, FrontSide, Group, Line, LineBasicMaterial, LineSegments, Matrix4, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, NormalBlending, Object3D, PlaneGeometry, PointLight, Points, PointsMaterial, Quaternion, ShaderMaterial, SphereGeometry,
  Sprite, SpriteMaterial, TorusGeometry, Vector2, Vector3
} from "three"

/**
 * The classes of three.js a module's script draws with (see ModuleScriptContext.three): the page's own, since a copy of three.js of the
 * module's would be a second three.js whose objects the scene's renderer does not take for its own.
 *
 * A list, and not the whole of three.js: giving its namespace would keep every one of its exports in every bundle of this project (120 kB
 * more in the scene's), where these are what the scene already uses. A class a module needs and does not find here is a line to add.
 */
export const MODULE_THREE = {
  AdditiveBlending, BackSide, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, Color, ConeGeometry, CylinderGeometry, DataTexture,
  DoubleSide, Euler, Float32BufferAttribute, FrontSide, Group, Line, LineBasicMaterial, LineSegments, Matrix4, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, NormalBlending, Object3D, PlaneGeometry, PointLight, Points, PointsMaterial, Quaternion, ShaderMaterial, SphereGeometry,
  Sprite, SpriteMaterial, TorusGeometry, Vector2, Vector3
} as const

export type ModuleThree = typeof MODULE_THREE
