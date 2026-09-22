export const ASSET_REGISTRY = Object.freeze({
  chocolate: { id: 'chocolate', name: 'CHOCOLATE', label: '巧克力補給', asset: 'chocolate.webp', visionEffect: 'range', strength: 6, duration: 8 },
  drink: { id: 'drink', name: 'CANNED DRINK', label: '罐裝飲料補給', asset: 'drink.webp', visionEffect: 'duration', strength: 8, duration: 8 }
});

export const FUTURE_VISION_EFFECTS = Object.freeze(['range', 'duration', 'reveal', 'forward', 'trail']);
