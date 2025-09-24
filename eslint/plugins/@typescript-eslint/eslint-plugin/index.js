module.exports = {
  rules: {
    'no-explicit-any': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow explicit any types',
          recommended: false,
        },
        schema: [],
        messages: {
          unexpectedAny: 'Unexpected any. Specify a different type.',
        },
      },
      create(context) {
        return {
          TSAnyKeyword(node) {
            context.report({ node, messageId: 'unexpectedAny' });
          },
        };
      },
    },
  },
};
