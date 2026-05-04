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
exports.AuthResponseDto = exports.SwitchOrganizationDto = exports.LoginDto = exports.SignupDto = void 0;
var class_validator_1 = require("class-validator");
var SignupDto = (function () {
    function SignupDto() {
    }
    __decorate([
        (0, class_validator_1.IsEmail)(),
        __metadata("design:type", String)
    ], SignupDto.prototype, "email", void 0);
    __decorate([
        (0, class_validator_1.IsString)(),
        (0, class_validator_1.MinLength)(8),
        __metadata("design:type", String)
    ], SignupDto.prototype, "password", void 0);
    __decorate([
        (0, class_validator_1.IsString)(),
        __metadata("design:type", String)
    ], SignupDto.prototype, "name", void 0);
    __decorate([
        (0, class_validator_1.IsString)(),
        __metadata("design:type", String)
    ], SignupDto.prototype, "orgName", void 0);
    return SignupDto;
}());
exports.SignupDto = SignupDto;
var LoginDto = (function () {
    function LoginDto() {
    }
    __decorate([
        (0, class_validator_1.IsEmail)(),
        __metadata("design:type", String)
    ], LoginDto.prototype, "email", void 0);
    __decorate([
        (0, class_validator_1.IsString)(),
        __metadata("design:type", String)
    ], LoginDto.prototype, "password", void 0);
    return LoginDto;
}());
exports.LoginDto = LoginDto;
var SwitchOrganizationDto = (function () {
    function SwitchOrganizationDto() {
    }
    __decorate([
        (0, class_validator_1.IsString)(),
        __metadata("design:type", String)
    ], SwitchOrganizationDto.prototype, "organizationId", void 0);
    return SwitchOrganizationDto;
}());
exports.SwitchOrganizationDto = SwitchOrganizationDto;
var AuthResponseDto = (function () {
    function AuthResponseDto() {
    }
    return AuthResponseDto;
}());
exports.AuthResponseDto = AuthResponseDto;
//# sourceMappingURL=dto.js.map