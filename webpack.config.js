const path = require("path");
const pkg = require("./package.json");

/** @type import("webpack").Configuration */
module.exports = {
  mode: "production",
  entry: "./src/index.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: `fastframe.js`,
    clean: true,
    library: {
      name: "Fastframe",
      type: "commonjs",
    },
  },
  externals: Object.keys(pkg.dependencies),
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.worker\.ts$/,
        loader: "worker-loader",
        options: {
          inline: "no-fallback",
        },
      },
      {
        test: /\.tsx?$/,
        loader: "esbuild-loader",
        options: {
          loader: "ts",
          target: "es2018",
        },
      },
    ],
  },
};
