export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["assets/typing.wav","favicon.png"]),
	mimeTypes: {".wav":"audio/wav",".png":"image/png"},
	_: {
		client: {"start":"_app/immutable/entry/start.63AhPGf1.js","app":"_app/immutable/entry/app.CGGU5_xe.js","imports":["_app/immutable/entry/start.63AhPGf1.js","_app/immutable/chunks/entry.BvPnGTHO.js","_app/immutable/chunks/scheduler.CYFynt7j.js","_app/immutable/chunks/index.D8mVmiTF.js","_app/immutable/entry/app.CGGU5_xe.js","_app/immutable/chunks/scheduler.CYFynt7j.js","_app/immutable/chunks/index.iosNfj23.js"],"stylesheets":[],"fonts":[],"uses_env_dynamic_public":false},
		nodes: [
			__memo(() => import('../output/server/nodes/0.js')),
			__memo(() => import('../output/server/nodes/1.js'))
		],
		routes: [
			
		],
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
