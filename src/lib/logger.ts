import pino from "pino";

export default pino({ prettyPrint: true, base: null, serializers: pino.stdSerializers });
