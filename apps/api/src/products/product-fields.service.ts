import { GoneException, Injectable } from '@nestjs/common';

@Injectable()
export class ProductFieldsService {
  list() {
    return [];
  }

  get() {
    throw new GoneException('Legacy product fields were removed. Use layout fields in product types.');
  }

  create() {
    throw new GoneException('Legacy product fields were removed. Use layout fields in product types.');
  }

  update() {
    throw new GoneException('Legacy product fields were removed. Use layout fields in product types.');
  }

  delete() {
    throw new GoneException('Legacy product fields were removed. Use layout fields in product types.');
  }
}
