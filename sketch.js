function degToRad(deg){
  return THREE.MathUtils.degToRad(deg);
}
function radToDeg(rad){
  return rad*180/Math.PI;
}
function round(num, places) {
  var multiplier = Math.pow(10, places);
  return Math.round(num * multiplier) / multiplier;
}
class Entity{
  constructor(id,x,y,z,mesh){
    this.id = id;
    this.mesh = mesh;
    this.mesh.position.x = x;
    this.mesh.position.y = y;
    this.mesh.position.z = z;
  }
  transform(x,y,z){
    this.mesh.translateX(x);
    this.mesh.translateY(y);
    this.mesh.translateZ(z);
    
  }
  rotate(x,y,z){
    this.mesh.rotateX(x);
    this.mesh.rotateY(y);
    this.mesh.rotateZ(z);
  }
  update(time){
    
  }
}

class Plane extends Entity{
  constructor(id,x,y,z,s,a,mP,mR,mY,bS,mesh){
    super(id,x,y,z,mesh);
    this.topSpeed = s;
    this.speed = 0;
    this.actor = null;
    this.isActor = false;
    this.brakeSpeed = bS;
    this.accel = a;
    this.mnvrPitch = mP;
    this.mnvrRoll = mR;
    this.mnvrYaw = mY;
    this.pitch = 0;
    this.roll = 0;
    this.yaw = 0;
    this.lift = 0;
  }
  increaseSpeed(){
    if(this.speed < this.topSpeed){
      this.speed += this.accel;
    }
  }
  decreaseSpeed(){
    if(this.speed > 0){
      this.speed -= this.brakeSpeed;
    }
    else{
      this.speed = 0;
    }
  }
  maneuver(axis,direction){
    if(axis == "pitch"){
      if(direction == "up"){
        this.rotate(-this.mnvrPitch/100,0,0);
      }
      else if(direction == "down"){
        this.rotate(this.mnvrPitch/100,0,0);
      }
    }
    if(axis == "roll"){
      if(direction == "right"){
        this.rotate(0,0,this.mnvrRoll/100);
      }
      else if(direction == "left"){
        this.rotate(0,0,-this.mnvrRoll/100);
      }
    }
    if(axis == "yaw"){
      if(direction == "right"){
        this.rotate(0,this.mnvrYaw/100,0);
      }
      else if(direction == "left"){
        this.rotate(0,-this.mnvrYaw/100,0);
      }
    }
  }
  update(time){
    if(this.isActor){
      this.actor.update(time);
    }
    this.mesh.translateZ(this.speed/100);
    let rollMod;
    if((this.mesh.rotation.z)*180/Math.PI > 90 && (this.mesh.rotation.z)*180/Math.PI < 180){
      rollMod = 180 - (this.mesh.rotation.z)*180/Math.PI;
    }
    else if((this.mesh.rotation.z)*180/Math.PI < -90 && (this.mesh.rotation.z)*180/Math.PI >= -180){
      rollMod = 180 + (this.mesh.rotation.z)*180/Math.PI;
    }
    else{
      rollMod = (this.mesh.rotation.z)*180/Math.PI;
    }
    this.lift = this.speed - ((abs(rollMod)/90)*1000)
    }
}

class EnemyActor{
  constructor(obj){
    this.actor = obj;
    this.actor.isActor = true;
    this.actor.actor = this;
    this.target = null;
    this.onTarget = false;
    this.radar = new THREE.Raycaster();
    this.attacking = false;
    this.seen = [];
    this.locked = [];
    this.stats = {
      "aggression":50
    }
    this.aggression = 0;
  }
  update(time){
    if(this.target != null){
      if(this.aggression > 1000000000){
        this.attacking = true;
        this.aggression = 0;
      }
      else{
        this.aggression += time/1000;
      }
      if(this.attacking){
        this.radar.set(this.actor.mesh.position,new THREE.Vector3(0,0,1));
        this.seen.length = 0;
        this.radar.intersectObjects(engine.objects,true,this.seen);
        if(this.seen.length === 0){
          let startRotation = this.actor.mesh.rotation.clone();
          this.actor.mesh.lookAt( this.target.mesh.position );
          let endRotation = this.actor.mesh.rotation.clone();
          this.attacking = false;
          this.actor.mesh.rotation.copy(startRotation);
          new TWEEN.Tween( this.actor.mesh.rotation )
            .to( { x:endRotation.x,y:endRotation.y,z:endRotation.z }, 2000 )
            .onComplete(()=>{
              if(THREE.MathUtils.randInt(0,100) > this.stats.aggression){
                console.log("reengaging");
                this.attacking = true;
              }
            })
            .start();
        }
      }
    }
  }
  rotateToTarget(){
    //above =  0-1 0 
    //below =  0 1 0
    //front =  0 0 1
    //back =   0 0-1
    //left =   1 0 0
    //right = -1 0 0
    let direction = new THREE.Vector3();
    direction.subVectors(this.target.mesh.position,this.actor.mesh.position).normalize();
    return direction;
  }
}

class Engine{
  constructor(){
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(90,window.innerWidth/window.innerHeight,0.1,200000);
    this.camera.position.x = 0;
    this.camera.position.y = 25;
    this.camera.position.z = -50;
    this.camera.rotation.y = THREE.MathUtils.degToRad(270);
    this.light = new THREE.DirectionalLight(0xffffff,1);
    this.light.castShadow = true;
    this.player = null;
    this.gravity = 10;
    this.scene.add(this.light);
    this.scene.background = new THREE.Color( 0xaaccff );
    //this.scene.fog = new THREE.Fog( 0xaaccff, 1, 20000);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;
    this.renderer.setSize(window.innerWidth,window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
    this.objects = {};
    this.entities = {};
    this.actors = [];
    this.arrowHelper = new THREE.ArrowHelper(new THREE.Vector3(0,0,0),new THREE.Vector3(0,50,0),1);
    this.scene.add(this.arrowHelper);
  }
  add(id,mesh){
    this.objects[id] = mesh;
    this.scene.add(mesh);
  }
  addEntity(id,entity){
    this.objects[id] = entity.mesh;
    this.entities[id] = entity;
    this.scene.add(entity.mesh);
  }
  addActor(id,actor){
    this.objects[id] = actor.actor.mesh;
    this.entities[id] = actor.actor;
    this.actors[id] = actor;
    this.scene.add(actor.actor.mesh);
  }
  render(){
    this.renderer.render(this.scene,this.camera);
  }
  update(time){
    for(let i=0;i<Object.keys(engine.entities).length;i++){
      engine.entities[Object.keys(engine.entities)[i]].update(time);
    }
    document.getElementById("speed").innerText = `${engine.player.speed}u/s`;
    let direction = engine.actors.testEnemy.rotateToTarget();
    document.getElementById("lift").innerText = `${direction.x},${direction.y},${direction.z}`;
    document.getElementById("ai_position").innerText = `x:${engine.actors.testEnemy.actor.mesh.position.x} y: ${engine.actors.testEnemy.actor.mesh.position.y} z:${engine.actors.testEnemy.actor.mesh.position.z}`;
    document.getElementById("ai_rotation").innerText = `x:${radToDeg(engine.actors.testEnemy.actor.mesh.rotation.x)} y: ${radToDeg(engine.actors.testEnemy.actor.mesh.rotation.y)} z:${radToDeg(engine.actors.testEnemy.actor.mesh.rotation.z)}`;
    document.getElementById("ai_speed").innerText = `${engine.actors.testEnemy.actor.speed}`;
    document.getElementById("ai_aggro").innerText = `${engine.actors.testEnemy.aggression}`;
    if(keyIsDown(67)){
      this.chase(this.player.mesh,new THREE.Vector3(0,25,50));
    }
    else{
      this.chase(this.player.mesh,new THREE.Vector3(0,25,-50));
    }
    if(keyIsDown(86)){
      engine.camera.lookAt(engine.entities.testEnemy.mesh.position);
    }
    if(keyIsDown(65)){
      engine.player.maneuver("roll","left");
    }
    else if(keyIsDown(68)){
      engine.player.maneuver("roll","right");
    }
    if (keyIsDown(81)){
      engine.player.maneuver("yaw","right");
    }
    else if(keyIsDown(69)){
      engine.player.maneuver("yaw","left")
    }
    if(keyIsDown(87)){
      engine.player.maneuver("pitch","down");
    }
    else if(keyIsDown(83)){
      engine.player.maneuver("pitch","up")
    }
    if(keyIsDown(16)){
      engine.player.increaseSpeed();
    }
    else if(keyIsDown(90)){
      engine.player.decreaseSpeed();
    }
  }
  chase(object,offset){   
    let cameraTarget = offset.applyMatrix4(object.matrixWorld);
    
    let tween = new TWEEN.Tween(this.camera.position)
      .to(cameraTarget,10)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start()
    
    engine.camera.lookAt(object.position);
  }
}

function setup(){}

const engine = new Engine();

const fbxLoader = new THREE.FBXLoader();
const gltfLoader = new THREE.GLTFLoader();
const objLoader = new THREE.OBJLoader();

let playerModel;

let loaded = false;

let loader = new Promise((res,rej)=>{
  fbxLoader.load("./assets/f16/source/lowpoly2.fbx",(obj)=>{
    playerModel = obj;
    //                        id,   x, y,z, s, a,mP,mR,mY,bS,mesh
    let player = new Plane("player",0,50,0,2000,2,2,4,1,2,playerModel);
    player.rotate(0,degToRad(90),0);
    engine.addEntity("player",player);
    engine.player = player;
    engine.player.mesh.castShadow = true;
  });
  fbxLoader.load("./assets/f16/source/lowpoly2.fbx",(obj)=>{
    let enemyModel = obj;
    enemyModel.castShadow = true;
    enemyModel.recieveShadow = true;
    let enemy = new Plane("testEnemy",0,50,50,2000,2,2,3,1,2,enemyModel);
    enemy.rotate(0,degToRad(90),0);
    //enemy.speed = 1500;
    let actor = new EnemyActor(enemy);
    actor.target = engine.player;
    engine.addActor("testEnemy",actor);
  });
  gltfLoader.load("./assets/terrain/scene.gltf",(gltf)=>{
    gltf.scene.scale.set(100000,100000,100000);
    gltf.scene.recieveShadow = true;
    engine.add("terrain",gltf.scene);
    res("Loaded");
  });
})
  
loader.then((msg)=>{
  console.log(msg);
  loaded = true;
});

function animate(time){
  requestAnimationFrame(animate);
  TWEEN.update(time);
  engine.update(time);
  engine.render();
}

animate();


/*function draw(){
  TWEEN.update();
  if(loaded){
    engine.update();
    engine.render();
  }
}
*/