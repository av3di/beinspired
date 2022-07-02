var camera, scene, renderer, firefly, moon;
var water_normals;
var pause = true;
var crate_time = 0, wing_time = 0;
var boundary;
var crates_array = [];
var abd, abd2;

const FIREFLY_RADIUS = 0.25;
const CRATE_DEPTH = 1;
const MIN_DIST = CRATE_DEPTH + FIREFLY_RADIUS;

var start_game = false;
var mouseXOnMouseDown, mouseX;
var swipe_direction = 0;
var move_left = false, move_right = false;
var double_speed = false;

$("a.play_button").click(function () // start and show game when start button is clicked
{
	$("div.screen").animate({opacity: 0}, function()
	{
		$("div.screen").css({zIndex: -5});
		$("div#score").css({opacity: 1});
		pause = false;
		start_game = true;
	});
});

THREE.DefaultLoadingManager.onProgress = function ( item, loaded, total )
{
	console.log( item, loaded, total );
	var percentage = (loaded/total).toPrecision(2) * 100;
	document.getElementById("load_bar").innerHTML = percentage.toString() + "%";
};
THREE.DefaultLoadingManager.onLoad = function()
{
	$("div#load_status").css({display: "none"});
	$("a#start").css({zIndex: 1});
	$("a#start").animate({opacity: 1});  // onload show the start button
	animateScene();
};
THREE.DefaultLoadingManager.onError = function()
{
	$("div#load_status").css({display: "none"});
	$("#error").css({zIndex: 1});
	$("#error").animate({opacity: 1});  // onload show the start button
}

initializeScene();

function initializeScene()
{
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 100 );
	renderer = new THREE.WebGLRenderer({alpha: true});
	renderer.setClearColor(0x060119, 1);
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

	// Add Ambient Lighting *********************************
	var amb_light = new THREE.AmbientLight( 0x333333);
	scene.add(amb_light);

	// Add hero *****************************************
	// every object must have its own geometry and material
	var firefly_geometry = new THREE.SphereGeometry(FIREFLY_RADIUS, 15, 15);
	var firefly_material = new THREE.MeshBasicMaterial( { color: 0xfcf485 } );

	firefly = new THREE.Mesh(firefly_geometry, firefly_material);
	scene.add(firefly);

	THREE.ImageUtils.crossOrigin = '';
	var sprite_material = new THREE.SpriteMaterial(
	{
		map: THREE.ImageUtils.loadTexture('glow.png'),
		color: 0xffff00, transparent: false, blending: THREE.AdditiveBlending
	});
	var sprite = new THREE.Sprite(sprite_material);
	sprite.scale.set(2, 2, 1.0);
	firefly.add(sprite);


	var firefly_light = new THREE.PointLight(0xffff00, 1);
	firefly_light.position.set(0, 0, 0.3);
	firefly_light.distance = 30;
	firefly.add(firefly_light);

	var abd_geometry = new THREE.SphereGeometry(0.25, 10, 10);
	var abd_mat = new THREE.MeshLambertMaterial({color: 0xF2F200});
	 abd = new THREE.Mesh(abd_geometry, abd_mat);
	abd.position.z = 0.25;
	firefly.add(abd);

	var abd2_geometry = new THREE.SphereGeometry(0.25, 10, 10);
	var abd2_mat = new THREE.MeshLambertMaterial({color: 0xF2F200});
	abd2 = new THREE.Mesh(abd2_geometry, abd2_mat);
	abd2.position.z = 0.25;
	firefly.add(abd2);


	var wing_geo = new THREE.PlaneBufferGeometry(1.5, 0.25);
	var wing_mat = new THREE.MeshLambertMaterial({color: 0xF2F200});
	var left_wing = new THREE.Mesh(wing_geo, wing_mat);
	var right_wing = new THREE.Mesh(wing_geo, wing_mat);

	left_wing.position.x = 0.5;
	left_wing.rotation.x = Math.PI * -90 / 180; // -90 degrees around the xaxis to make it horizontal
	abd.rotation.z = Math.PI * -45 / 180;

	right_wing.position.x = -0.5;
	right_wing.rotation.x = Math.PI * -90 / 180; // -90 degrees around the xaxis to make it horizontal
	abd2.rotation.z = Math.PI * 45 / 180;

	abd.add(left_wing);
	abd2.add(right_wing);

	camera.position.z = -8.0;
	camera.position.y = 4;
	scene.add(camera);

	// Calculate flight left and right boundary of firefly
	boundary = 2 * Math.tan((camera.fov / 2) * Math.PI / 180) * (Math.abs(camera.position.z) );
	boundary = boundary * camera.aspect;
	boundary = (boundary / 2) - 1; // get max pos x coord


	// Add Moon ******************************************************
	var moon_geometry = new THREE.SphereGeometry(10, 30, 30);
	var moon_texture = THREE.ImageUtils.loadTexture('full-moon2.jpg');
	var moon_material = new THREE.MeshBasicMaterial({map: moon_texture});
	moon = new THREE.Mesh(moon_geometry, moon_material);
	moon.position.y = 0;
	moon.position.z = 109;
	moon.position.x = 0;
	scene.add(moon);

	// Add shore *******************************
	var ground_mat = new THREE.MeshLambertMaterial({color: 0x00aa00});
	var ground_geo = new THREE.PlaneBufferGeometry(100, 100000);

	var l_ground = new THREE.Mesh(ground_geo, ground_mat);
	l_ground.rotation.x = Math.PI * -90 / 180; // -90 degrees around the xaxis to make it horizontal
	l_ground.position.x = 70.0;
	l_ground.position.y = -1.75; // lower it
	l_ground.position.z = 49900;
	scene.add(l_ground);

	var r_ground = new THREE.Mesh(ground_geo, ground_mat);
	r_ground.rotation.x = Math.PI * -90 / 180; // -90 degrees around the xaxis to make it horizontal
	r_ground.position.x = -70.0;
	r_ground.position.y = -1.75; // lower it
	r_ground.position.z = 49900;
	scene.add(r_ground);

	// Add water **********************************
	THREE.ImageUtils.crossOrigin = '';
	water_normals = THREE.ImageUtils.loadTexture('water.jpg');
	water_normals.wrapS = water_normals.wrapT = THREE.RepeatWrapping;
	water = new THREE.Water( renderer, camera, scene, {
		textureWidth: 512,
		textureHeight: 512,
		waterNormals: water_normals,
		alpha: 1.0,
		sunDirection: moon.position.clone().normalize(),
		sunColor: 0xffffff,
		waterColor: 0x06243B, // 0x09395C
		distortionScale: 50.0
	});
	mirror_mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(40, 100000), water.material);
	mirror_mesh.add(water);
	mirror_mesh.position.y = -1.5;
	mirror_mesh.rotation.x = -Math.PI * 0.5;
	mirror_mesh.position.z = 49900;
	scene.add(mirror_mesh);

	// Crates ********************************************************
	var crate_textures = [];
	crate_textures[0] = THREE.ImageUtils.loadTexture("crate1.png");
	crate_textures[1] = THREE.ImageUtils.loadTexture("crate2.png");
	crate_textures[2] = THREE.ImageUtils.loadTexture("crate3.png");

	var z_pos_crate = 24;
	for( i = 0; i < 1000; i+= 1)
	{
		var index = Math.floor(Math.random() * 3);
		var crate_g = new THREE.BoxGeometry(2, 3, CRATE_DEPTH); // width height depth
		var crate_m = new THREE.MeshLambertMaterial({map: crate_textures[index]});
		var crate = new THREE.Mesh(crate_g, crate_m);

		var rotation_z = Math.random();
		if(rotation_z < 0.5)
			crate.rotation.z = Math.PI * -10 / 180;
		else
			crate.rotation.z = Math.PI * 10 / 180;

		crate.position.z = z_pos_crate;
		crate.position.y = mirror_mesh.position.y + 0.5;
		var pos_x = Math.random() * 3;
		if( pos_x < 1)
			crate.position.x = 0;
		else if (pos_x < 2)
			crate.position.x = boundary;
		else
			crate.position.x = -boundary;

		crates_array[i] = crate;
		scene.add(crate);
		z_pos_crate += 8;
	}


/*
	var collada_loader = new THREE.ColladaLoader();
	collada_loader.options.convertUpAxis = true;
	collada_loader.load("./stone_lantern.dae", function(collada)
		{
			firefly_dae = collada.scene;

			var firefly_skin = collada.skins[0];
			firefly_dae.position.set(0, -22, 3);
			firefly_dae.scale.set(7, 7, 7);
			firefly_dae.traverse( function ( child ) {
				if ( child instanceof THREE.SkinnedMesh ) {
					var animation = new THREE.Animation( child, child.geometry.animation );
					animation.play();
				}
			});
			firefly_dae.updateMatrix();
			scene.add(firefly_dae);
		});

		var fire_geometry = new THREE.SphereGeometry(1, 15, 15);
	// uses Lamberts algorithm for light calculations   0xfcf485
	var fire_material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );

	fire = new THREE.Mesh(fire_geometry, fire_material);
	fire.position.set(0, -10, 3);
	scene.add(fire);

	THREE.ImageUtils.crossOrigin = '';
	var sprite_f_material = new THREE.SpriteMaterial(
	{
		map: THREE.ImageUtils.loadTexture('http://i.imgur.com/LGtGzpn.png'),
		color: 0xff0000, transparent: false, blending: THREE.AdditiveBlending
	});
	var sprite_f = new THREE.Sprite(sprite_f_material);
	sprite_f.scale.set(5, 5, 1.0);
	fire.add(sprite_f);
*/

	window.addEventListener( 'resize', onWindowResize, false );
	document.addEventListener('keydown', onDocumentKeyDown, false);
	document.addEventListener('touchstart', onDocumentTouchStart, false);
	document.addEventListener('touchmove', onDocumentTouchMove, false);
	document.addEventListener('touchend', onDocumentTouchEnd, false);
}
function onDocumentTouchStart(event)
{
	if(event.touches.length === 1)
	{
		mouseXOnMouseDown = event.touches[0].pageX - (window.innerWidth / 2);
	}
}

function onDocumentTouchMove(event)
{
	if(event.touches.length === 1)
	{
		event.preventDefault();
		mouseX = event.touches[0].pageX - (window.innerWidth / 2);
	}
}
function onDocumentTouchEnd(event)
{
	swipe_direction = mouseX - mouseXOnMouseDown;
	if(swipe_direction < -20)
	{
		move_left = true;
		move_right = false;
	}
	else if(swipe_direction > 20)
	{
		move_right = true;
		move_left = false;
	}
	else
	{
		if(pause) pause = false;
		else pause = true;
	}
}
function onDocumentKeyDown(event)
{
	var key_code = event.which;
	switch(key_code)
	{
		case 37:  // left
			move_left = true;
			move_right = false;
			break;
		case 39: // right
			move_right = true;
			move_left = false;
			break;
		case 80:  //p
			if(pause)
				pause = false;
			else
				pause = true;
			break;
		default:
			break;
	}
}
function animateScene()
{
	// place anything you want to move or change while game is running in here
	function render()
	{
		requestAnimationFrame(render); // pauses when user navigates to another tab which saves processing power and battery life vs setInterval
		if(move_left)
			moveLeft();
		else if(move_right)
			moveRight();
		move_right = false;
		move_left = false;
		if(start_game)
		{
			firefly.position.x = 0;
			firefly.position.z = 0;
			camera.position.z = -8;
			moon.position.z = 109;
			start_game = false;
		}

		if(!pause)
		{
			if(firefly.position.z < 800)
			{
				firefly.position.z += 1.0;
				camera.position.z += 1.0;
				moon.position.z += 1.0;
			}
			else if(firefly.position.z < 1600)
			{
				firefly.position.z += 1.5;
				camera.position.z += 1.5;
				moon.position.z += 1.5;
			}
			else if(firefly.position.z % 2 == 0)
			{
				firefly.position.z += 2.0;
				camera.position.z += 2.0;
				moon.position.z += 2.0;
				double_speed = true;
			}
			else if(!double_speed)
			{
				firefly.position.z += 1.5;
				camera.position.z += 1.5;
				moon.position.z += 1.5;
			}
			else
			{
				firefly.position.z += 2.0;
				camera.position.z += 2.0;
				moon.position.z += 2.0;
			}
			// Check for collisions
			checkForCollisions();
			// Add Score
			if(firefly.position.z >= 24)
			{
				if((firefly.position.z % 8 == 0) && (firefly.position.z < 800 || firefly.position.z > 1600))
				{
					var scoreboard = document.getElementById("score");
					var score = parseInt(scoreboard.innerHTML) + 1;
					scoreboard.innerHTML = score;
				}
				else if((firefly.position.z % 8 == 0 || firefly.position.z % 8 >= 7) && firefly.position.z > 800 && firefly.position.z < 1600)
				{
					var scoreboard = document.getElementById("score");
					var score = parseInt(scoreboard.innerHTML) + 1;
					scoreboard.innerHTML = score;
				}
			}
		}

		// animate crates
		animateCrates(crate_time);
		if(crate_time >= 0.99)
			crate_time = 0;
		else
			crate_time += 0.01;

		// animate wings
		animateWings(wing_time);
		if(wing_time >= 150)
			wing_time = 0;
		else
			wing_time += 30.0;

		// Causes water to move but gives problems on mobile
		//var time = performance.now() * 0.001;
		//water.material.uniforms.time.value += 1.0 / 60.0;
		water.render();
		var look_at = new THREE.Vector3(0, firefly.position.y, firefly.position.z);
		camera.lookAt(look_at);
		renderer.render(scene, camera);
	}
	render();
}



function onWindowResize(){

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );

}

function moveLeft()
{
	if(firefly.position.x == 0)
		firefly.position.x += boundary;
	else if(firefly.position.x == -boundary)
		firefly.position.x = 0;
}
function moveRight()
{
	if(firefly.position.x  == 0)
		firefly.position.x -= boundary;
	else if(firefly.position.x == boundary)
		firefly.position.x = 0;
}

function checkForCollisions()
{
	var collided = false;
	var start_index = 0;
	var f2index = Math.floor((firefly.position.z / 8) - 3);
	if( f2index > 0 && f2index < crates_array.length)
		start_index = f2index;
	else
		start_index = 0;
	for(i = start_index; i < crates_array.length; i++)
	{
		if(Math.abs(firefly.position.z - crates_array[i].position.z) < MIN_DIST && Math.abs(firefly.position.x - crates_array[i].position.x) < MIN_DIST)
		{
			collided = true;
			break;
		}
	}
	if(collided)
	{
		pause = true;
		var current_score = $("div#score").text();
		$("h3#final_score").text(current_score);
		var highest_score = parseInt($("h3#highest_score").text());
		if(current_score > highest_score)
		{
			$("h3#highest_score").text(current_score);
			$("h3#high_score_heading").text("New High Score");
		}
		else
		{
			$("h3#high_score_heading").text("High Score");
		}
		$("div#game_over").css({zIndex: 5});
		$("div#game_over").animate({opacity : 1});
		$("div#score").css({opacity: 0});
		$("div#score").text("0");
	}
}

function animateCrates(cratetime)
{
	if(cratetime <= 0.5)
	{
		for(i = 0; i < crates_array.length; i++)
			crates_array[i].position.y += 0.01;
	}
	else
	{
		for(i = 0; i < crates_array.length; i++)
			crates_array[i].position.y -= 0.01;
	}
}
function animateWings(wingtime)
{
	if(wingtime < 90)
	{
		abd.rotation.z += 30.0 * Math.PI / 180;
		abd2.rotation.z -= 30.0 * Math.PI / 180;
	}
	else
	{
		abd.rotation.z -= 30.0 * Math.PI / 180;
		abd2.rotation.z += 30.0 * Math.PI / 180;
	}
}
