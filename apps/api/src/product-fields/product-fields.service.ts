import { GoneException, Injectable } from '@nestjs/common';

@Injectable()
export class ProductFieldsService {
  list() {
    return [];
  }

  create() {
    throw new GoneException('Legacy product fields were removed. Use Settings > Layout fields instead.');
  }

  update() {
    throw new GoneException('Legacy product fields were removed. Use Settings > Layout fields instead.');
  }

  deactivate() {
    throw new GoneException('Legacy product fields were removed. Use Settings > Layout fields instead.');
  }
}
