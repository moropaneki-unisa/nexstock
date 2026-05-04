"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsModule = void 0;
var common_1 = require("@nestjs/common");
var webhooks_module_1 = require("../webhooks/webhooks.module");
var products_controller_1 = require("./products.controller");
var products_service_1 = require("./products.service");
var ProductsModule = (function () {
    function ProductsModule() {
    }
    ProductsModule = __decorate([
        (0, common_1.Module)({
            imports: [webhooks_module_1.WebhooksModule],
            controllers: [products_controller_1.ProductsController],
            providers: [products_service_1.ProductsService],
            exports: [products_service_1.ProductsService],
        })
    ], ProductsModule);
    return ProductsModule;
}());
exports.ProductsModule = ProductsModule;
//# sourceMappingURL=products.module.js.map