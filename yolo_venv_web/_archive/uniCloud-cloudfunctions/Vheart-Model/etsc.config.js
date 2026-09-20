module.exports = {
	esbuild: {
		outdir: "./dist",
		minify: true,
		target: "es2017",
		platform: "node",
		format: "cjs"
	}
};