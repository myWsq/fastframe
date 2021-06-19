const path = require("path");
const htmlWebpackPlugin = require("html-webpack-plugin");

/** @type import("webpack").Configuration */
module.exports = {
  context: path.resolve(__dirname, "example"),
  mode: "development",
  entry: "./main.ts",
  plugins: [
    new htmlWebpackPlugin({
      template: "./index.html",
    }),
  ],
  devtool: "source-map",
  devServer: {
    port: 3000,
  },
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
