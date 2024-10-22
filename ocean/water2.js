
THREE.Water = function ( geometry, options ) {

	THREE.Mesh.call( this, geometry );

	var scope = this;

    var normalSampler = options.waterNormals
    normalSampler.wrapS = normalSampler.wrapT = THREE.RepeatWrapping

	var eye = new THREE.Vector3( 0, 0, 0 );
    var textureMatrix = new THREE.Matrix4();
	var parameters = {
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		format: THREE.RGBFormat,
		stencilBuffer: false
	};

	var renderTarget = new THREE.WebGLRenderTarget( 512, 512, parameters );
	var mirrorShader = {
		uniforms: THREE.UniformsUtils.merge( [
			THREE.UniformsLib[ 'fog' ],
			THREE.UniformsLib[ 'lights' ],
			{
				"normalSampler": { value: null },
				"mirrorSampler": { value: null },
				"alpha": { value: 1.0 },
				"time": { value: 0.0 },
				"size": { value: 1.0 },
				"distortionScale": { value: 3.7 },
				"textureMatrix": { value: new THREE.Matrix4() },
				"sunColor": { value: new THREE.Color( 0x7F7F7F ) },
				"sunDirection": { value: new THREE.Vector3( 0.70707, 0.70707, 0 ) },
				"eye": { value: new THREE.Vector3() },
				"waterColor": { value: new THREE.Color( 0x001e0f ) }
			}
		] ),

		vertexShader: [
			'uniform mat4 textureMatrix;',
			'uniform float time;',
			'varying vec4 mirrorCoord;',
			'varying vec4 worldPosition;',
			THREE.ShaderChunk[ 'fog_pars_vertex' ],
			THREE.ShaderChunk[ 'shadowmap_pars_vertex' ],
			'void main() {',
			'	mirrorCoord = modelMatrix * vec4( position, 1.0 );',
			'	worldPosition = mirrorCoord.xyzw;',
			'	mirrorCoord = textureMatrix * mirrorCoord;',
			'	vec4 mvPosition =  modelViewMatrix * vec4( position, 1.0 );',
			'	gl_Position = projectionMatrix * mvPosition;',

			THREE.ShaderChunk[ 'fog_vertex' ],
			THREE.ShaderChunk[ 'shadowmap_vertex' ],

			'}'
		].join( '\n' ),

		fragmentShader: [
			'uniform sampler2D mirrorSampler;',
			'uniform float alpha;',
			'uniform float time;',
			'uniform float size;',
			'uniform float distortionScale;',
			'uniform sampler2D normalSampler;',
			'uniform vec3 sunColor;',
			'uniform vec3 sunDirection;',
			'uniform vec3 eye;',
			'uniform vec3 waterColor;',

			'varying vec4 mirrorCoord;',
			'varying vec4 worldPosition;',

			'vec4 getNoise( vec2 uv ) {',
			'	vec2 uv0 = ( uv / 103.0 ) + vec2(time / 17.0, time / 29.0);',
			'	vec2 uv1 = uv / 107.0-vec2( time / -19.0, time / 31.0 );',
			'	vec2 uv2 = uv / vec2( 8907.0, 9803.0 ) + vec2( time / 101.0, time / 97.0 );',
			'	vec2 uv3 = uv / vec2( 1091.0, 1027.0 ) - vec2( time / 109.0, time / -113.0 );',
			'	vec4 noise = texture2D( normalSampler, uv0 ) +',
			'		texture2D( normalSampler, uv1 ) +',
			'		texture2D( normalSampler, uv2 ) +',
			'		texture2D( normalSampler, uv3 );',
			'	return noise * 0.5 - 1.0;',
			'}',

			'void sunLight( const vec3 surfaceNormal, const vec3 eyeDirection, float shiny, float spec, float diffuse, inout vec3 diffuseColor, inout vec3 specularColor ) {',
			'	vec3 reflection = normalize( reflect( -sunDirection, surfaceNormal ) );',
			'	float direction = max( 0.0, dot( eyeDirection, reflection ) );',
			'	specularColor += pow( direction, shiny ) * sunColor * spec;',
			'	diffuseColor += max( dot( sunDirection, surfaceNormal ), 0.0 ) * sunColor * diffuse;',
			'}',

			THREE.ShaderChunk[ 'common' ],
			THREE.ShaderChunk[ 'packing' ],
			THREE.ShaderChunk[ 'bsdfs' ],
			THREE.ShaderChunk[ 'fog_pars_fragment' ],
			THREE.ShaderChunk[ 'lights_pars_begin' ],
			THREE.ShaderChunk[ 'shadowmap_pars_fragment' ],
			THREE.ShaderChunk[ 'shadowmask_pars_fragment' ],

			'void main() {',
			'	vec4 noise = getNoise( worldPosition.xz * size );',
			'	vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );',
			'	vec3 diffuseLight = vec3(0.0);',
			'	vec3 specularLight = vec3(0.0);',
			'	vec3 worldToEye = eye-worldPosition.xyz;',
			'	vec3 eyeDirection = normalize( worldToEye );',
			'	sunLight( surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight );',
			'	float distance = length(worldToEye);',
			'	vec2 distortion = surfaceNormal.xz * ( 0.001 + 1.0 / distance ) * distortionScale;',
			'	vec3 reflectionSample = vec3( texture2D( mirrorSampler, mirrorCoord.xy / mirrorCoord.w + distortion ) );',
			'	float theta = max( dot( eyeDirection, surfaceNormal ), 0.0 );',
			'	float rf0 = 0.3;',
			'	float reflectance = rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 );',
			'	vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;',
			'	vec3 albedo = mix( ( sunColor * diffuseLight * 0.3 + scatter ) * getShadowMask(), ( vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight ), reflectance);',
			'	vec3 outgoingLight = albedo;',
			'	gl_FragColor = vec4( outgoingLight, alpha );',
			THREE.ShaderChunk[ 'tonemapping_fragment' ],
			THREE.ShaderChunk[ 'fog_fragment' ],
			'}'
		].join( '\n' )
	};

	var material = new THREE.ShaderMaterial( {
		fragmentShader: mirrorShader.fragmentShader,
		vertexShader: mirrorShader.vertexShader,
		uniforms: THREE.UniformsUtils.clone( mirrorShader.uniforms ),
		transparent: true,
		lights: true,
		side: THREE.FrontSide,
		fog: false
	} );

	material.uniforms[ "mirrorSampler" ].value = renderTarget.texture;
	material.uniforms[ "textureMatrix" ].value = textureMatrix;
	material.uniforms[ "normalSampler" ].value = normalSampler;

	material.uniforms[ "eye" ].value = eye;

	scope.material = material;

	scope.onBeforeRender = function ( renderer, scene, camera ) {
        var mirrorCamera = new THREE.PerspectiveCamera();
        var mirrorPlane = new THREE.Plane();
        var normal = new THREE.Vector3();
        var mirrorWorldPosition = new THREE.Vector3();
        var cameraWorldPosition = new THREE.Vector3();
        var rotationMatrix = new THREE.Matrix4();
        var lookAtPosition = new THREE.Vector3( 0, 0, - 1 );
        var clipPlane = new THREE.Vector4();
        var view = new THREE.Vector3();
        var target = new THREE.Vector3();
        var q = new THREE.Vector4();
    
		mirrorWorldPosition.setFromMatrixPosition( scope.matrixWorld );
		cameraWorldPosition.setFromMatrixPosition( camera.matrixWorld );

		rotationMatrix.extractRotation( scope.matrixWorld );

		normal.set( 0, 0, 1 );
		normal.applyMatrix4( rotationMatrix );

		view.subVectors( mirrorWorldPosition, cameraWorldPosition );

		// Avoid rendering when mirror is facing away

		if ( view.dot( normal ) > 0 ) return;

		view.reflect( normal ).negate();
		view.add( mirrorWorldPosition );

		rotationMatrix.extractRotation( camera.matrixWorld );

		lookAtPosition.set( 0, 0, - 1 );
		lookAtPosition.applyMatrix4( rotationMatrix );
		lookAtPosition.add( cameraWorldPosition );

		target.subVectors( mirrorWorldPosition, lookAtPosition );
		target.reflect( normal ).negate();
		target.add( mirrorWorldPosition );

		mirrorCamera.position.copy( view );
		mirrorCamera.up.set( 0, 1, 0 );
		mirrorCamera.up.applyMatrix4( rotationMatrix );
		mirrorCamera.up.reflect( normal );
		mirrorCamera.lookAt( target );

		mirrorCamera.far = camera.far; // Used in WebGLBackground

		mirrorCamera.updateMatrixWorld();
		mirrorCamera.projectionMatrix.copy( camera.projectionMatrix );

		// Update the texture matrix
		textureMatrix.set(
			0.5, 0.0, 0.0, 0.5,
			0.0, 0.5, 0.0, 0.5,
			0.0, 0.0, 0.5, 0.5,
			0.0, 0.0, 0.0, 1.0
		);
		textureMatrix.multiply( mirrorCamera.projectionMatrix );
		textureMatrix.multiply( mirrorCamera.matrixWorldInverse );

		// Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
		// Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
		mirrorPlane.setFromNormalAndCoplanarPoint( normal, mirrorWorldPosition );
		mirrorPlane.applyMatrix4( mirrorCamera.matrixWorldInverse );

		clipPlane.set( mirrorPlane.normal.x, mirrorPlane.normal.y, mirrorPlane.normal.z, mirrorPlane.constant );

		var projectionMatrix = mirrorCamera.projectionMatrix;

		q.x = ( Math.sign( clipPlane.x ) + projectionMatrix.elements[ 8 ] ) / projectionMatrix.elements[ 0 ];
		q.y = ( Math.sign( clipPlane.y ) + projectionMatrix.elements[ 9 ] ) / projectionMatrix.elements[ 5 ];
		q.z = - 1.0;
		q.w = ( 1.0 + projectionMatrix.elements[ 10 ] ) / projectionMatrix.elements[ 14 ];

		// Calculate the scaled plane vector
		clipPlane.multiplyScalar( 2.0 / clipPlane.dot( q ) );

		// Replacing the third row of the projection matrix
		projectionMatrix.elements[ 2 ] = clipPlane.x;
		projectionMatrix.elements[ 6 ] = clipPlane.y;
		projectionMatrix.elements[ 10 ] = clipPlane.z + 1.0 - 0.0;
		projectionMatrix.elements[ 14 ] = clipPlane.w;

		eye.setFromMatrixPosition( camera.matrixWorld );

		//

		var currentRenderTarget = renderer.getRenderTarget();

		var currentVrEnabled = renderer.vr.enabled;
		var currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;

		scope.visible = false;

		renderer.vr.enabled = false; // Avoid camera modification and recursion
		renderer.shadowMap.autoUpdate = false; // Avoid re-computing shadows

		renderer.setRenderTarget( renderTarget );
		renderer.clear();
		renderer.render( scene, mirrorCamera );

		scope.visible = true;

		renderer.vr.enabled = currentVrEnabled;
		renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;

		renderer.setRenderTarget( currentRenderTarget );

	};

};

THREE.Water.prototype = Object.create( THREE.Mesh.prototype );
THREE.Water.prototype.constructor = THREE.Water;
