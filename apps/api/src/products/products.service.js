"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
var common_1 = require("@nestjs/common");
var prisma_service_1 = require("../prisma/prisma.service");
var webhook_events_service_1 = require("../webhooks/webhook-events.service");
var ProductsService = (function () {
    function ProductsService(prisma, webhooks) {
        this.prisma = prisma;
        this.webhooks = webhooks;
    }
    ProductsService.prototype.list = function (organizationId, query) {
        return __awaiter(this, void 0, void 0, function () {
            var page, limit, where, _a, items, total;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        page = Math.max(Number((_b = query.page) !== null && _b !== void 0 ? _b : 1), 1);
                        limit = Math.min(Math.max(Number((_c = query.limit) !== null && _c !== void 0 ? _c : 25), 1), 100);
                        where = __assign(__assign({ organizationId: organizationId, deletedAt: null }, (query.category ? { category: query.category } : {})), (query.search
                            ? {
                                OR: [
                                    { name: { contains: query.search, mode: 'insensitive' } },
                                    { sku: { contains: query.search, mode: 'insensitive' } },
                                ],
                            }
                            : {}));
                        return [4, Promise.all([
                                this.prisma.product.findMany({
                                    where: where,
                                    skip: (page - 1) * limit,
                                    take: limit,
                                    orderBy: { createdAt: 'desc' },
                                    include: { variants: true },
                                }),
                                this.prisma.product.count({ where: where }),
                            ])];
                    case 1:
                        _a = _d.sent(), items = _a[0], total = _a[1];
                        return [2, { items: items, pagination: { page: page, limit: limit, total: total, pages: Math.ceil(total / limit) } }];
                }
            });
        });
    };
    ProductsService.prototype.get = function (organizationId, id) {
        return __awaiter(this, void 0, void 0, function () {
            var product;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.prisma.product.findFirst({
                            where: { id: id, organizationId: organizationId, deletedAt: null },
                            include: { variants: true },
                        })];
                    case 1:
                        product = _a.sent();
                        if (!product)
                            throw new common_1.NotFoundException('Product not found');
                        return [2, product];
                }
            });
        });
    };
    ProductsService.prototype.create = function (organizationId, dto) {
        return __awaiter(this, void 0, void 0, function () {
            var normalizedSku, existing, product;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        normalizedSku = dto.sku.trim();
                        return [4, this.prisma.product.findUnique({
                                where: { organizationId_sku: { organizationId: organizationId, sku: normalizedSku } },
                            })];
                    case 1:
                        existing = _a.sent();
                        if (existing)
                            throw new common_1.ConflictException('SKU already exists in this organization');
                        return [4, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                var created;
                                var _a, _b, _c, _d, _e;
                                return __generator(this, function (_f) {
                                    switch (_f.label) {
                                        case 0: return [4, tx.product.create({
                                                data: {
                                                    organizationId: organizationId,
                                                    name: dto.name.trim(),
                                                    sku: normalizedSku,
                                                    description: (_a = dto.description) === null || _a === void 0 ? void 0 : _a.trim(),
                                                    price: dto.price,
                                                    cost: dto.cost,
                                                    quantity: (_b = dto.quantity) !== null && _b !== void 0 ? _b : 0,
                                                    lowStockLevel: (_c = dto.lowStockLevel) !== null && _c !== void 0 ? _c : 5,
                                                    category: (_d = dto.category) === null || _d === void 0 ? void 0 : _d.trim(),
                                                    images: (_e = dto.images) !== null && _e !== void 0 ? _e : [],
                                                },
                                            })];
                                        case 1:
                                            created = _f.sent();
                                            return [4, tx.inventoryLog.create({
                                                    data: {
                                                        organizationId: organizationId,
                                                        productId: created.id,
                                                        type: 'manual',
                                                        quantityBefore: 0,
                                                        quantityAfter: created.quantity,
                                                        delta: created.quantity,
                                                        reason: 'Initial product creation',
                                                        source: 'app',
                                                    },
                                                })];
                                        case 2:
                                            _f.sent();
                                            return [2, created];
                                    }
                                });
                            }); })];
                    case 2:
                        product = _a.sent();
                        return [4, this.webhooks.emit(organizationId, 'product_created', {
                                productId: product.id,
                                sku: product.sku,
                                name: product.name,
                            })];
                    case 3:
                        _a.sent();
                        return [2, product];
                }
            });
        });
    };
    ProductsService.prototype.update = function (organizationId, id, dto) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, duplicate, data, updated;
            var _this = this;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4, this.get(organizationId, id)];
                    case 1:
                        existing = _c.sent();
                        if (!(dto.sku && dto.sku !== existing.sku)) return [3, 3];
                        return [4, this.prisma.product.findUnique({
                                where: { organizationId_sku: { organizationId: organizationId, sku: dto.sku.trim() } },
                            })];
                    case 2:
                        duplicate = _c.sent();
                        if (duplicate)
                            throw new common_1.ConflictException('SKU already exists in this organization');
                        _c.label = 3;
                    case 3:
                        data = __assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign({}, (dto.name !== undefined ? { name: dto.name.trim() } : {})), (dto.sku !== undefined ? { sku: dto.sku.trim() } : {})), (dto.description !== undefined ? { description: (_a = dto.description) === null || _a === void 0 ? void 0 : _a.trim() } : {})), (dto.price !== undefined ? { price: dto.price } : {})), (dto.cost !== undefined ? { cost: dto.cost } : {})), (dto.quantity !== undefined ? { quantity: dto.quantity } : {})), (dto.lowStockLevel !== undefined ? { lowStockLevel: dto.lowStockLevel } : {})), (dto.category !== undefined ? { category: (_b = dto.category) === null || _b === void 0 ? void 0 : _b.trim() } : {})), (dto.images !== undefined ? { images: dto.images } : {}));
                        return [4, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                var product;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4, tx.product.update({
                                                where: { id_organizationId: { id: id, organizationId: organizationId } },
                                                data: data,
                                            })];
                                        case 1:
                                            product = _a.sent();
                                            if (!(dto.quantity !== undefined && dto.quantity !== existing.quantity)) return [3, 3];
                                            return [4, tx.inventoryLog.create({
                                                    data: {
                                                        organizationId: organizationId,
                                                        productId: id,
                                                        type: 'adjustment',
                                                        quantityBefore: existing.quantity,
                                                        quantityAfter: dto.quantity,
                                                        delta: dto.quantity - existing.quantity,
                                                        reason: 'Quantity updated',
                                                        source: 'app',
                                                    },
                                                })];
                                        case 2:
                                            _a.sent();
                                            _a.label = 3;
                                        case 3: return [2, product];
                                    }
                                });
                            }); })];
                    case 4:
                        updated = _c.sent();
                        if (!(dto.quantity !== undefined && dto.quantity !== existing.quantity)) return [3, 6];
                        return [4, this.webhooks.emit(organizationId, 'inventory_updated', {
                                productId: id,
                                previousQuantity: existing.quantity,
                                newQuantity: dto.quantity,
                            })];
                    case 5:
                        _c.sent();
                        _c.label = 6;
                    case 6: return [4, this.webhooks.emit(organizationId, 'product_updated', {
                            productId: id,
                            sku: updated.sku,
                            name: updated.name,
                        })];
                    case 7:
                        _c.sent();
                        return [2, updated];
                }
            });
        });
    };
    ProductsService.prototype.adjustInventory = function (organizationId, id, dto) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, nextQuantity, updated;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.get(organizationId, id)];
                    case 1:
                        existing = _a.sent();
                        nextQuantity = existing.quantity + dto.delta;
                        if (nextQuantity < 0)
                            throw new common_1.ConflictException('Inventory quantity cannot go below zero');
                        return [4, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                var product;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0: return [4, tx.product.update({
                                                where: { id_organizationId: { id: id, organizationId: organizationId } },
                                                data: { quantity: nextQuantity },
                                            })];
                                        case 1:
                                            product = _b.sent();
                                            return [4, tx.inventoryLog.create({
                                                    data: {
                                                        organizationId: organizationId,
                                                        productId: id,
                                                        type: 'adjustment',
                                                        quantityBefore: existing.quantity,
                                                        quantityAfter: nextQuantity,
                                                        delta: dto.delta,
                                                        reason: (_a = dto.reason) !== null && _a !== void 0 ? _a : 'Inventory adjustment',
                                                        source: 'app',
                                                        referenceId: dto.referenceId,
                                                    },
                                                })];
                                        case 2:
                                            _b.sent();
                                            return [2, product];
                                    }
                                });
                            }); })];
                    case 2:
                        updated = _a.sent();
                        return [4, this.webhooks.emit(organizationId, 'inventory_updated', {
                                productId: id,
                                previousQuantity: existing.quantity,
                                newQuantity: nextQuantity,
                            })];
                    case 3:
                        _a.sent();
                        return [2, updated];
                }
            });
        });
    };
    ProductsService.prototype.softDelete = function (organizationId, id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.get(organizationId, id)];
                    case 1:
                        _a.sent();
                        return [2, this.prisma.product.update({
                                where: { id_organizationId: { id: id, organizationId: organizationId } },
                                data: { deletedAt: new Date(), status: 'archived' },
                            })];
                }
            });
        });
    };
    ProductsService = __decorate([
        (0, common_1.Injectable)(),
        __metadata("design:paramtypes", [prisma_service_1.PrismaService,
            webhook_events_service_1.WebhookEventsService])
    ], ProductsService);
    return ProductsService;
}());
exports.ProductsService = ProductsService;
//# sourceMappingURL=products.service.js.map