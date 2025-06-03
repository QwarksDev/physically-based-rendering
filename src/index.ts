import { GUI } from 'dat.gui';
import { mat4, vec3 } from 'gl-matrix';
import { Camera } from './camera';
import { GameObject } from './gameobject';
import { Geometry } from './geometries/geometry';
import { SphereGeometry } from './geometries/sphere';
import { GLContext } from './gl';
import { PointLight } from './lights/lights';
import { PBRShader } from './shader/pbr-shader';
import { Texture, Texture2D } from './textures/texture';
import { Material } from './textures/material';
import { Transform } from './transform';
import { UniformType } from './types';

interface GUIProperties {
  albedo: number[];
  sky: number[];
  ponctual: boolean;
  hundred: boolean;
}

/**
 * Class representing the current application with its state.
 *
 * @class Application
 */
class Application {
  /**
   * Context used to draw to the canvas
  
   * @private
   */
  private _context: GLContext;

  private _shader: PBRShader;
  private _geometry: Geometry[];
  private _gameobject: GameObject[];
  private _gameobjecthundred: GameObject[];
  private _light: PointLight[];
  private _uniforms: Record<string, UniformType | Texture>;

  private _textureExample: Texture2D<HTMLElement> | null;
  private _iblDiffuseTexture: Texture2D<HTMLElement> | null;
  private _iblSpecularTexture: Texture2D<HTMLElement> | null;

  private _camera: Camera;

  /**
   * Object updated with the properties from the GUI
   *
   * @private
   */
  private _guiProperties: GUIProperties;

  constructor(canvas: HTMLCanvasElement) {
    this._iblDiffuseTexture = null;
    this._iblSpecularTexture = null;
    this._context = new GLContext(canvas);
    this._camera = new Camera();

    this._geometry = [
      new SphereGeometry(0.2, 32, 32),
      new SphereGeometry(0.1, 16, 16)
    ];

    this._gameobject = [];
    for (let i = 0; i < 25; ++i) {
      let tr = new Transform();
      vec3.set(tr.position, (Math.floor(i / 5) - 2) / 2, (i % 5 - 2) / 2, -1.5);
      let m = new Material(.95 * Math.floor(i / 5) / 4 + .025, .95 * (i % 5) / 4 + .025);
      this._gameobject.push(new GameObject(this._geometry[0], tr, m));
    }

    this._gameobjecthundred = [];
    for (let i = 0; i < 100; ++i) {
      let tr = new Transform();
      vec3.set(tr.position, (Math.floor(i / 10) - 4.5) / 4, (i % 10 - 4.5) / 4, -1.5);
      let m = new Material(.95 * Math.floor(i / 10) / 9 + .025, .95 * (i % 10) / 9 + .025);
      this._gameobjecthundred.push(new GameObject(this._geometry[1], tr, m));
    }

    this._light = [];
    const colors = [ [ 1, 1, 1 ], [ 1, 1, 1 ], [ 1, 1, 1 ], [ 1, 1, 1 ] ];
    for (let i = 0; i < 4; ++i) {
      let light = new PointLight();
      vec3.set(light.positionWS, 2.5 * (i % 2 - .5), 2.5 * (Math.floor(i / 2) % 2 - .5), 0);
      vec3.set(light.color, colors[i][0], colors[i][1], colors[i][2]);
      light.intensity = .25;
      this._light.push(light);
    }

    this._uniforms = {
      'uMaterial.albedo': vec3.create(),
      'uModel.localToProjection': mat4.create(),
      'uModel.translation': mat4.create(),
      'cameraPosition': this._camera.transform.position
    };

    for (let i = 0; i < 4; ++i) {
      this._uniforms[`light[${i}].positionWS`] = this._light[i].positionWS;
      this._uniforms[`light[${i}].color`] = this._light[i].color;
      this._uniforms[`light[${i}].intensity`] = this._light[i].intensity;
    }

    this._shader = new PBRShader();
    this._textureExample = null;

    this._guiProperties = {
      albedo: [50, 220, 200],
      sky: [25, 25, 25],
      ponctual: false,
      hundred: false
    };

    this._createGUI();
  }

  /**
   * Initializes the application.
   */
  async init() {
    for (var geometry of this._geometry) {
      this._context.uploadGeometry(geometry);
    }
    this._context.compileProgram(this._shader);

    // Example showing how to load a texture and upload it to GPU.
    this._textureExample = await Texture2D.load(
      'assets/ggx-brdf-integrated.png'
    );
    if (this._textureExample !== null) {
      this._context.uploadTexture(this._textureExample);
      this._uniforms['p_texture'] = this._textureExample;
    }

    this._iblDiffuseTexture = await Texture2D.load(
      'assets/env/Alexs_Apt_2k-diffuse-RGBM.png'
    );
    if (this._iblDiffuseTexture !== null) {
      this._context.uploadTexture(this._iblDiffuseTexture);
      this._uniforms['d_texture'] = this._iblDiffuseTexture;
    }

    this._iblSpecularTexture = await Texture2D.load(
      'assets/env/Alexs_Apt_2k-specular-RGBM.png'
    );
    if (this._iblSpecularTexture !== null) {
      this._context.uploadTexture(this._iblSpecularTexture);
      this._uniforms['s_texture'] = this._iblSpecularTexture;
    }
  }

  /**
   * Called at every loop, before the [[Application.render]] method.
   */
  update() {
    /** Empty. */
  }

  /**
   * Called when the canvas size changes.
   */
  resize() {
    this._context.resize();
  }

  /**
   * Called at every loop, after the [[Application.update]] method.
   */
  render() {
    const props = this._guiProperties;

    this._context.clear();
    this._context.setDepthTest(true);
    this._context.setClearColor(
      props.sky[0] / 255,
      props.sky[1] / 255,
      props.sky[2] / 255,
      1.0
    );
    // this._context.setCulling(WebGL2RenderingContext.BACK);

    const aspect =
      this._context.gl.drawingBufferWidth /
      this._context.gl.drawingBufferHeight;

    const camera = this._camera;
    vec3.set(camera.transform.position, 0.0, 0.0, 2.0);
    camera.setParameters(aspect);
    camera.update();

    // Set the color from the GUI into the uniform list.
    vec3.set(
      this._uniforms['uMaterial.albedo'] as vec3,
      props.albedo[0] / 255,
      props.albedo[1] / 255,
      props.albedo[2] / 255
    );

    this._uniforms['ponctual'] = props.ponctual;

    // Sets the viewProjection matrix.
    // **Note**: if you want to modify the position of the geometry, you will
    // need to take the matrix of the mesh into account here.
    mat4.copy(
      this._uniforms['uModel.localToProjection'] as mat4,
      camera.localToProjection
    );

    if (props.hundred)
      for (var gameobject of this._gameobjecthundred) {
        this._context.draw_gameobject(gameobject, this._shader, this._uniforms);
      }
    else
    for (var gameobject of this._gameobject) {
      this._context.draw_gameobject(gameobject, this._shader, this._uniforms);
    }
    mat4.copy(
      this._uniforms['uModel.translation'] as mat4,
      mat4.create()
    );
  }

  /**
   * Creates a GUI floating on the upper right side of the page.
   *
   * ## Note
   *
   * You are free to do whatever you want with this GUI. It's useful to have
   * parameters you can dynamically change to see what happens.
   *
   *
   * @private
   */
  private _createGUI(): GUI {
    const gui = new GUI();
    gui.addColor(this._guiProperties, 'albedo');
    gui.addColor(this._guiProperties, 'sky');
    gui.add(this._guiProperties, 'ponctual');
    gui.add(this._guiProperties, 'hundred');
    return gui;
  }
}

const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
const app = new Application(canvas as HTMLCanvasElement);
app.init();

function animate() {
  app.update();
  app.render();
  window.requestAnimationFrame(animate);
}
animate();

/**
 * Handles resize.
 */

const resizeObserver = new ResizeObserver((entries) => {
  if (entries.length > 0) {
    const entry = entries[0];
    canvas.width = window.devicePixelRatio * entry.contentRect.width;
    canvas.height = window.devicePixelRatio * entry.contentRect.height;
    app.resize();
  }
});

resizeObserver.observe(canvas);
