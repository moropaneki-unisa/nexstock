"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdjustInventoryDto = exports.UpdateProductDto = exports.CreateProductDto = exports.ListProductsDto = void 0;
var class_transformer_1 = require("class-transformer");
var class_validator_1 = require("class-validator");
var ListProductsDto = (function () {
    function ListProductsDto() {
        this.page = 1;
        this.limit = 25;
    }
    __decorate([
        (0, class_validator_1.IsOptional)(),
        (0, class_validator_1.IsString)(),
        __metadata("design:type", String)
    ], ListProductsDto.prototype, "search", void 0);
    __decorate([
        (0, class_validator_1.IsOptional)(),
        (0, class_validator_1.IsString)(),
        __metadata("design:type", String)
    ], ListProductsDto.prototype, "category", void 0);
    __decorate([
        (0, class_validator_1.IsOptional)(),
        (0, class_transformer_1.Type)(function () { return Number; }),
        (0, class_validator_1.IsInt)(),
        (0, class_validator_1.Min)(1),
        __metadata("design:type", Number)
    ], ListProductsDto.prototype, "page", void 0);
    __decorate([
        (0, class_validator_1.IsOptional)(),
        (0, class_transformer_1.Type)(function () { return Number; }),
        (0, class_validator_1.IsInt)(),
        (0, class_validator_1.Min)(1),
        (0, class_validator_1.Max)(100),
        __metadata("design:type", Number)
    ], ListProductsDto.prototype, "limit", void 0);
    return ListProductsDto;
}());
exports.ListProductsDto = ListProductsDto;
var CreateProductDto = (function () {
    function CreateProductDto() {
        this.quantity = 0;
        this.lowStockLevel = 5;
    }
    __decorate([
        (0, class_validator_1.IsString)(),
        __metadata("design:type", String)
    ], CreateProductDto.prototype, "name", void 0);
    __decorate([
        (0, class_validator_1.IsString)(),
        __metadata("design:type", String)
    ], CreateProductDto.prototype, "sku", void 0);
    __decorate([
        (0, class_validator_1.IsOptional)(),
        (0, class_validator_1.IsString)(),
        __metadata("design:type", String)
    ], CreateProductDto.prototype, "description", void 0);
    __decorate([
        (0, class_transformer_1.Type)(function () { return Number; }),
        (0, class_validator_1.IsNumber)(),
        (0, class_validator_1.Min)(0),
        __metadata("design:type", Number)
    ], CreateProductDto.prototype, "price", void 0);
    __decorate([
        (0, class_validator_1.IsOptional)(),
        (0, class_transformer_1.Type)(function () { return Number; }),
        (0, class_validator_1.IsNumber)(),
        (0, class_validator_1.Min)(0),
        __metadata("design:type", Number)
    ], CreateProductDto.prototype, "cost", void 0);
    __decorate([
        (0, class_validator_1.IsOptional)(),
        (0, class_transformer_1.Type)(function () { return Number; }),
        (0, class_validator_1.IsInt)(),
        (0, class_validator_1.Min)(0),
        __metadata("design:type", Number)
    ], CreateProductDto.prototype, "quantity", void 0);
    __decorate([
        (0, class_validator_1.IsOptional)(),
        (0, class_transformer_1.Type)(function () { return Number; }),
        (0, class_validator_1.IsInt)(),
        (0, class_validator_1.Min)(0),
        __metadata("design:type", Number)
    ], CreateProductDto.prototype, "lowStockLevel", void 0);
    __decorate([
        (0, class_validator_1.IsOptional)(),
        (0, class_validator_1.IsString)(),
        __metadata("design:type", String)
    ], CreateProductDto.prototype, "category", void 0);
    __decorate([
        (0, class_validator_1.IsOptional)(),
        (0, class_validator_1.IsArray)(),
        (0, class_validator_1.IsString)({ each: true }),
        __metadata("design:type", Array)
    ], CreateProductDto.prototype, "images", void 0);
    return CreateProductDto;
}());
exports.CreateProductDto = CreateProductDto;
var UpdateProductDto = (function () {
    function UpdateProductDto() {
    }
    __decorate([
        (0, class_validator_1.IsOptional)(),
        (0, class_validator_1.IsString)(),
        __metadata("design:type", String)
    ], UpdateProductDto.prototype, "name", void 0);
    __decorate([
        (0, class_validator_1.IsOptional)(),
        (0, class_validator_1.IsString)(),
        __metadata("design:type", String)
    ], UpdateProductDto.prototype, "sku", void 0);
    __decorate([
        (0, class_validator_1.IsOptional)(),
        (0, class_validator_1.IsString)(),
        __metadata("design:type", String)
    ], UpdateProductDto.prototype, "description", void 0);
    __decorate([
        (0, class_validator_1.IsOptional)(),
        (0, class_transformer_1.Type)(function () { return Number; }),
        (0, class_validator_1.IsNumber)(),
        (0, class_validator_1.Min)(0),
        __metadata("design:type", Number)
    ], UpdateProductDto.prototype, "price", void 0);
    __decorate([
        (0, class_validator_1.IsOptional)(),
        (0, class_transformer_1.Type)(function () { return Number; }),
        (0, class_validator_1.IsNumber)(),
        (0, class_validator_1.Min)(0),
        __metadata("design:type", Number)
    ], UpdateProductDto.prototype, "cost", void 0);
    __decorate([
        (0, class_validator_1.IsOptional)(),
        (0, class_transformer_1.Type)(function () { return Number; }),
        (0, class_validator_1.IsInt)(),
        (0, class_validator_1.Min)(0),
        __metadata("design:type", Number)
    ], UpdateProductDto.prototype, "quantity", void 0);
    __decorate([
        (0, class_validator_1.IsOptional)(),
        (0, class_transformer_1.Type)(function () { return Number; }),
        (0, class_validator_1.IsInt)(),
        (0, class_validator_1.Min)(0),
        __metadata("design:type", Number)
    ], UpdateProductDto.prototype, "lowStockLevel", void 0);
    __decorate([
        (0, class_validator_1.IsOptional)(),
        (0, class_validator_1.IsString)(),
        __metadata("design:type", String)
    ], UpdateProductDto.prototype, "category", void 0);
    __decorate([
        (0, class_validator_1.IsOptional)(),
        (0, class_validator_1.IsArray)(),
        (0, class_validator_1.IsString)({ each: true }),
        __metadata("design:type", Array)
    ], UpdateProductDto.prototype, "images", void 0);
    return UpdateProductDto;
}());
exports.UpdateProductDto = UpdateProductDto;
var AdjustInventoryDto = (function () {
    function AdjustInventoryDto() {
    }
    __decorate([
        (0, class_transformer_1.Type)(function () { return Number; }),
        (0, class_validator_1.IsInt)(),
        __metadata("design:type", Number)
    ], AdjustInventoryDto.prototype, "delta", void 0);
    __decorate([
        (0, class_validator_1.IsOptional)(),
        (0, class_validator_1.IsString)(),
        __metadata("design:type", String)
    ], AdjustInventoryDto.prototype, "reason", void 0);
    __decorate([
        (0, class_validator_1.IsOptional)(),
        (0, class_validator_1.IsString)(),
        __metadata("design:type", String)
    ], AdjustInventoryDto.prototype, "referenceId", void 0);
    return AdjustInventoryDto;
}());
exports.AdjustInventoryDto = AdjustInventoryDto;
//# sourceMappingURL=dto.js.map