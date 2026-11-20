export const TURKISTAN_INVEST_SUPPORT_SUB_ROLE = 'turkistan_invest';

export const TURKISTAN_INVEST_ATTRACTION_SUB_ROLE =
    'turkistan_invest_attraction';

export const isTurkistanInvestSubRole = (subRole: string | null | undefined) =>
    subRole === TURKISTAN_INVEST_SUPPORT_SUB_ROLE ||
    subRole === TURKISTAN_INVEST_ATTRACTION_SUB_ROLE;

export const isTurkistanInvestAttractionSubRole = (
    subRole: string | null | undefined,
) => subRole === TURKISTAN_INVEST_ATTRACTION_SUB_ROLE;

export const investmentProjectCollectionLabel = (
    subRole: string | null | undefined,
) =>
    isTurkistanInvestAttractionSubRole(subRole)
        ? 'Тартылатын жобалар'
        : 'Инвестициялық жобалар';
