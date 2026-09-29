import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { PaymentProps } from '../domain/interfaces/payment.interface';
import {
  CreatePaymentDto,
  ListPaymentsQueryDto,
  UpdatePaymentDto,
} from '../dtos/payment.dto';
import { PaymentService } from '../services/payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  async create(@Body() body: CreatePaymentDto): Promise<PaymentProps> {
    const payment = await this.paymentService.create(body);
    return payment.toJSON();
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdatePaymentDto,
  ): Promise<PaymentProps> {
    const payment = await this.paymentService.update(id, body);
    return payment.toJSON();
  }

  @Get(':id')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentProps> {
    const payment = await this.paymentService.findById(id);
    return payment.toJSON();
  }

  @Get()
  async findAll(@Query() query: ListPaymentsQueryDto): Promise<PaymentProps[]> {
    const payments = await this.paymentService.findAll(query);
    return payments.map((payment) => payment.toJSON());
  }
}
