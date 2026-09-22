window.__ModuleLoader__.load({
	id: "dsh-company-pack",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region lib/types/client/Brand.js
		/** Sidebar brand occupants for the wochen deployment (company skin, first stroke). */
		/**
		* Render the sidebar brand name.
		* @returns the deployment wordmark.
		*/
		function WocheBrandName() {
			return (0, react_jsx_runtime.jsx)("span", { children: "DSH Wochen Team" });
		}
		//#endregion
		//#region lib/types/client/index.js
		/** Required service: the UI slot registry. */
		const inject = ["slots"];
		/**
		* Register the deployment's brand name in the sidebar.
		* @param ctx - Client root context.
		*/
		function apply(ctx) {
			ctx.slots.inject("sidebar.brand.name", () => ctx.slots.register({ name: "sidebar.brand.name" }, WocheBrandName));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map