# Oil on Three.js Template

This is a working examble of a realtime 3d scene that is supposed to look like a rough oil painting that is constantly changing.

The sample consists of basic Javascript and GLSL without any francy frameworks.

It utilises gl_PontSize to create the "planes" for the brush strokes.

To ensure the correct sorting, transparency can't be used. To still have transparent brush strokes it uses the discard command in the shader, which discards rendering of specifix fragments.

## Preview
http://ays-arts.de/public/oil-on-threejs-template/index.html

![base rendering](/readme/04_final.png)

## Creating the point clouds

This is my approach. There might be better options, based on your tool. In the end you need a point-type or a regular polygon-type mesh. It doesn't really matter. Three.js takes both.

It begins with a regular 3D scene. The mesh resolutions does not matter. These objects won't be used directly.

![base rendering](/readme/01_rendering.png)

The next step is about creating a point cloud. I chose to use a point cloud generator that creates fairly uniformly distributed points on any surface. I then used these points to create a polygon at each points position.

Why polygons? I couldn't manage to export a real point mesh so I chose this workaround. The polygons don't relly matter. In the end we only need the vertices. Again. this is highly tool-specific.

![base rendering](/readme/02_particle_mesh.png)

The final step is getting the color into the vertex color of each vertex. I first baked the output into a texture and converted the outcome to a vertex color attribute. You can skip the texture, if your tool allows your to direclty bake into the vertex color buffer.

![base rendering](/readme/03_vertex_color.png)

That's it. The shader will do the rest of the work for you.

Please let me know if you are building something cool bades on this idea.
