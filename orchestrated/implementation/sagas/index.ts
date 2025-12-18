import { saga_definition } from "../interfaces";
import { order_saga_definition  } from "./order-saga";

export const sagas: Record<string, saga_definition> = {
    order_saga: order_saga_definition
}