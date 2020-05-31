import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateProductService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found', 400);
    }

    const findProducts = await this.productsRepository.findAllById(products);

    if (findProducts.length !== products.length) {
      throw new AppError('Product not found', 400);
    }

    const foundQty = products.find(
      product =>
        product.quantity >
        (findProducts.find(findProduct => findProduct.id === product.id)
          ?.quantity || 0),
    );

    if (foundQty) {
      throw new AppError(`Produto ${foundQty.id} sem estoque`, 400);
    }

    const finalProducts = products.map(product => ({
      product_id: product.id,
      quantity: product.quantity,
      price:
        findProducts.find(findProduct => product.id === findProduct.id)
          ?.price || 0,
    }));

    const order = await this.ordersRepository.create({
      customer,
      products: finalProducts,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateProductService;
