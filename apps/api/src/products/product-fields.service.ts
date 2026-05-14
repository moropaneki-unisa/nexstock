import { GoneException, Injectable } from '@nestjs/common';

@Injectable()
export class ProductFieldsService {
  list(..._args: unknown[]) {
    return [];
  }

  get(..._args: unknown[]) {
    throw new GoneException('Legacy product fields were removed. Use layout fields in product types.');
  }

  create(..._args: unknown[]) {
    throw new GoneException('Legacy product fields were removed. Use layout fields in product types.');
  }

  update(..._args: unknown[]) {
    throw new GoneException('Legacy product fields were removed. Use layout fields in product types.');
  }

  delete(..._args: unknown[]) {
    throw new GoneException('Legacy product fields were removed. Use layout fields in product types.');
  }
}
