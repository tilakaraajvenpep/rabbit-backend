export const validateTotalHours = (items: { hoursSpent: number }[]) => {
  const total = items.reduce((sum, item) => sum + Number(item.hoursSpent), 0);
  return total > 0;
};
