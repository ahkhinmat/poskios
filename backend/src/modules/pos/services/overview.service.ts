import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { SalesOrderItem } from '../entities/sales-order-item.entity';
import { SalesOrder } from '../entities/sales-order.entity';
import { User } from '../../auth/entities/user.entity';

@Injectable()
export class OverviewService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private readonly purchaseOrderItemRepository: Repository<PurchaseOrderItem>,
    @InjectRepository(SalesOrder)
    private readonly salesOrderRepository: Repository<SalesOrder>,
    @InjectRepository(SalesOrderItem)
    private readonly salesOrderItemRepository: Repository<SalesOrderItem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getOverviewRecords(params: { fromDate?: string; toDate?: string }) {
    const fromDate = params.fromDate?.trim()
      ? new Date(`${params.fromDate.trim()}T00:00:00`)
      : new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00`);
    const toDate = params.toDate?.trim()
      ? new Date(`${params.toDate.trim()}T23:59:59.999`)
      : new Date(`${new Date().toISOString().slice(0, 10)}T23:59:59.999`);

    const purchaseOrders = await this.purchaseOrderRepository.find({ order: { orderedAt: 'DESC', id: 'DESC' } });
    const salesOrders = await this.salesOrderRepository.find({ order: { soldAt: 'DESC', id: 'DESC' } });

    // Resolve user names for sales orders
    const userIds = [...new Set(salesOrders.map((o) => o.createdByUserId).filter(Boolean))];
    const users = userIds.length
      ? await this.userRepository.find({ where: { id: In(userIds) } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u.fullName]));

    const purchaseItems = await this.purchaseOrderItemRepository.find({
      where: { purchaseOrderId: In(purchaseOrders.map((order) => order.id)) },
    });

    const salesItems = await this.salesOrderItemRepository.find({
      where: { salesOrderId: In(salesOrders.map((order) => order.id)) },
    });

    const purchaseCostMap = new Map<number, number>();
    for (const item of purchaseItems) {
      const costAmount = Number(item.costPrice) * Number(item.quantity);
      purchaseCostMap.set(item.purchaseOrderId, (purchaseCostMap.get(item.purchaseOrderId) ?? 0) + costAmount);
    }

    const salesCostMap = new Map<number, number>();
    for (const item of salesItems) {
      const costAmount = Number(item.costPrice) * Number(item.quantity);
      salesCostMap.set(item.salesOrderId, (salesCostMap.get(item.salesOrderId) ?? 0) + costAmount);
    }

    const items = [
      ...purchaseOrders
        .filter((order) => order.orderedAt >= fromDate && order.orderedAt <= toDate)
        .map((order) => ({
          id: order.id, recordType: 'PURCHASE', code: order.purchaseOrderCode, status: order.status,
          partyName: order.supplierNameSnapshot, subtotalAmount: Number(order.subtotalAmount),
          discountAmount: Number(order.discountAmount), loyaltyDiscountAmount: 0, totalAmount: Number(order.totalAmount),
          costAmount: Number((purchaseCostMap.get(order.id) ?? Number(order.totalAmount)).toFixed(2)), revenueAmount: 0, eventAt: order.orderedAt,
        })),
      ...salesOrders
        .filter((order) => order.soldAt >= fromDate && order.soldAt <= toDate)
        .map((order) => {
          const isReturn = order.orderType === 'RETURN';
          const costAmount = Number((salesCostMap.get(order.id) ?? 0).toFixed(2));
          return {
            id: order.id, recordType: isReturn ? 'RETURN' : 'SALE', code: order.salesOrderCode, status: order.status,
            partyName: order.customerName, subtotalAmount: Number(order.subtotalAmount),
            discountAmount: Number(order.discountAmount), loyaltyDiscountAmount: Number(order.loyaltyDiscountAmount ?? 0),
            totalAmount: Number(order.totalAmount), costAmount: isReturn ? -costAmount : costAmount,
            revenueAmount: isReturn ? -Number(order.totalAmount) : Number(order.totalAmount), eventAt: order.soldAt,
            createdByUserFullName: userMap.get(order.createdByUserId) ?? null,
          };
        }),
    ].sort((left, right) => new Date(right.eventAt).getTime() - new Date(left.eventAt).getTime() || right.id - left.id);

    return { items };
  }

  async getTopProducts(params: { fromDate?: string; toDate?: string }) {
    const fromDate = params.fromDate?.trim()
      ? new Date(`${params.fromDate.trim()}T00:00:00`)
      : new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00`);
    const toDate = params.toDate?.trim()
      ? new Date(`${params.toDate.trim()}T23:59:59.999`)
      : new Date(`${new Date().toISOString().slice(0, 10)}T23:59:59.999`);

    const result = await this.salesOrderItemRepository
      .createQueryBuilder('item')
      .innerJoin(SalesOrder, 'order', 'order.Id = item.SalesOrderId')
      .where('order.OrderType = :orderType', { orderType: 'SALE' })
      .andWhere('order.Status != :cancelled', { cancelled: 'CANCELLED' })
      .andWhere('order.SoldAt >= :fromDate', { fromDate })
      .andWhere('order.SoldAt <= :toDate', { toDate })
      .select([
        'item.ProductId AS productId',
        'item.ProductCodeSnapshot AS productCode',
        'item.ProductNameSnapshot AS productName',
        'item.UnitNameSnapshot AS unitName',
        'SUM(item.Quantity) AS totalQuantity',
        'SUM(item.LineTotal) AS totalRevenue',
      ])
      .groupBy('item.ProductId')
      .addGroupBy('item.ProductCodeSnapshot')
      .addGroupBy('item.ProductNameSnapshot')
      .addGroupBy('item.UnitNameSnapshot')
      .orderBy('SUM(item.LineTotal)', 'DESC')
      .take(10)
      .getRawMany();

    return {
      items: result.map((r: any) => ({
        productId: Number(r.productId),
        productCode: r.productCode,
        productName: r.productName,
        unitName: r.unitName,
        totalQuantity: Number(r.totalQuantity),
        totalRevenue: Number(r.totalRevenue),
      })),
    };
  }

  async getOverviewDetail(recordType: string, id: number) {
    const normalizedType = recordType.trim().toUpperCase();

    if (normalizedType === 'PURCHASE') {
      const order = await this.purchaseOrderRepository.findOne({ where: { id } });
      if (!order) throw new NotFoundException('Purchase order not found');

      const items = await this.purchaseOrderItemRepository.find({ where: { purchaseOrderId: id } });

      return {
        header: { id: order.id, recordType: 'PURCHASE', code: order.purchaseOrderCode, status: order.status, eventAt: order.orderedAt, partyName: order.supplierNameSnapshot, subtotalAmount: Number(order.subtotalAmount), discountAmount: Number(order.discountAmount), loyaltyDiscountAmount: 0, totalAmount: Number(order.totalAmount), costAmount: Number(order.totalAmount), revenueAmount: 0 },
        items: items.map((item, index) => ({
          rowNo: index + 1, eventDate: order.orderedAt, productCode: item.productCodeSnapshot, productName: item.productNameSnapshot,
          unitName: item.unitNameSnapshot, quantity: Number(item.quantity), unitPrice: Number(item.costPrice),
          costPrice: Number(item.costPrice), revenueAmount: Number(item.lineTotal), discountAmount: 0, lineTotal: Number(item.lineTotal),
        })),
      };
    }

    if (normalizedType === 'SALE' || normalizedType === 'RETURN') {
      const order = await this.salesOrderRepository.findOne({ where: { id } });
      if (!order) throw new NotFoundException('Sales order not found');

      const items = await this.salesOrderItemRepository.find({ where: { salesOrderId: id } });

      const isReturn = normalizedType === 'RETURN';
      const orderCostAmount = Number(items.reduce((sum, item) => sum + Number(item.costPrice) * Number(item.quantity), 0).toFixed(2));

      return {
        header: { id: order.id, recordType: normalizedType, code: order.salesOrderCode, status: order.status, eventAt: order.soldAt, partyName: order.customerName, subtotalAmount: Number(order.subtotalAmount), discountAmount: Number(order.discountAmount), loyaltyDiscountAmount: Number(order.loyaltyDiscountAmount ?? 0), totalAmount: Number(order.totalAmount), costAmount: isReturn ? -orderCostAmount : orderCostAmount, revenueAmount: isReturn ? -Number(order.totalAmount) : Number(order.totalAmount) },
        items: items.map((item, index) => ({
          rowNo: index + 1, eventDate: order.soldAt, productCode: item.productCodeSnapshot, productName: item.productNameSnapshot,
          unitName: item.unitNameSnapshot, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice),
          costPrice: isReturn ? -Number(item.costPrice) : Number(item.costPrice), revenueAmount: isReturn ? -Number(item.lineTotal) : Number(item.lineTotal),
          discountAmount: Number(item.discountAmount), lineTotal: isReturn ? -Number(item.lineTotal) : Number(item.lineTotal),
        })),
      };
    }

    throw new BadRequestException('Invalid overview record type');
  }
}
