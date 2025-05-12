import { type Plugin } from '@elizaos/core';
import { GammaService } from './services/gammaService';
import { readMarketsAction } from './actions/readMarkets';
import { readMarketAction } from './actions/readMarket';

const pluginPolymarket: Plugin = {
  name: 'plugin-polymarket',
  description: 'Plugin for Polymarket integration',
  actions: [readMarketsAction, readMarketAction],
};

export default pluginPolymarket;