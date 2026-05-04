import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  name!: string;

  @IsString()
  orgName!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class SwitchOrganizationDto {
  @IsString()
  organizationId!: string;
}

export class AuthResponseDto {
  accessToken!: string;
}
