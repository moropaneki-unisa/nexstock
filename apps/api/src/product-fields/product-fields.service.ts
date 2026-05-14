import { GoneException, Injectable } from '@nestjs/common';

@Injectable()
export class ProductFieldsService {
  list(..._args: unknown[]) {
    return [];
  }

  create(..._args: unknown[]) {
    throw new GoneException('Legacy product fields were removed. Use Settings > Layout fields instead.');
  }

  update(..._args: unknown[]) {
    throw new GoneException('Legacy product fields were removed. Use Settings > Layout fields instead.');
  }

  deactivate(..._args: unknown[]) {
    throw new GoneException('Legacy product fields were removed. Use Settings > Layout fields instead.');
  }
}
