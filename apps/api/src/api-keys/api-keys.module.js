"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeysModule = void 0;
var common_1 = require("@nestjs/common");
var api_key_guard_1 = require("./api-key.guard");
var api_keys_controller_1 = require("./api-keys.controller");
var ApiKeysModule = (function () {
    function ApiKeysModule() {
    }
    ApiKeysModule = __decorate([
        (0, common_1.Module)({
            controllers: [api_keys_controller_1.ApiKeysController],
            providers: [api_key_guard_1.ApiKeyGuard],
            exports: [api_key_guard_1.ApiKeyGuard],
        })
    ], ApiKeysModule);
    return ApiKeysModule;
}());
exports.ApiKeysModule = ApiKeysModule;
//# sourceMappingURL=api-keys.module.js.map