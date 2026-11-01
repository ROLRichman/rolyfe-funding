"use strict";

var fundingData = {};
var leads = JSON.parse(localStorage.getItem("rolyfeFundingLeads") || "[]");
var LINKS = {
  jamal: "https://agent.jotform.com/019bdd1fe57172838101dccf3612b1e9e787",
  booking: "https://richman-rootoflyfe.zohobookings.com/#/4699692000000050014",
  contract: "https://workdrive.zohoexternal.com/file/6zzgj6f913100497440d1b6166dfc729a61a4",
  writer: "https://workdrive.zohopublic.com/writer/open/l7x0hdd90d494415d44698cf35f472437b7a1"
};

var loanDefaults = {
  business_term: {rate:11,term:60,points:3,explainer:"Installment loan: fixed monthly principal and interest. Review business cash flow after operating expenses and existing debt service."},
  sba_7a: {rate:10.5,term:120,points:2,explainer:"SBA 7(a) estimate: amortized principal and interest using the rate and term you enter. Program eligibility, guarantee fees and lender conditions are not calculated."},
  sba_504: {rate:0,term:0,points:0,explainer:"Two-tranche estimate: separate bank first mortgage and CDC/SBA debenture payments, plus calculated borrower injection. Actual shares, rates, terms and fees depend on the project and CDC/lender."},
  real_estate_loc: {rate:12,term:12,points:2,explainer:"Revolving real-estate line: estimated interest-only payment on the outstanding draw, not on unused availability. Confirm draw period, floor, fees and maturity with the lender."},
  heloc: {rate:9.5,term:120,points:1,explainer:"Home-equity line estimate: choose interest-only draw-period payment or amortizing repayment. Combined LTV includes the existing lien balance you enter."},
  dscr: {rate:8.25,term:360,points:2,explainer:"Rental-property DSCR: monthly NOI divided by monthly PITIA-style debt service. NOI is rent less operating expenses; debt service includes principal, interest, taxes, insurance and HOA."},
  fix_flip: {rate:11.5,term:12,points:3,explainer:"Fix-and-flip estimate: interest-only cost on the requested balance, with loan-to-cost and loan-to-ARV screening. Staged draws can change actual interest."},
  bridge: {rate:12,term:12,points:3,explainer:"Bridge loan estimate: interest-only payments with principal due at maturity (balloon). Confirm extension, exit, draw and payoff terms."},
  private_money: {rate:12.5,term:12,points:3,explainer:"Private-money estimate: interest-only payments with principal due at maturity. Actual lender terms and payment frequency control."},
  working_capital: {rate:14,term:24,points:3,explainer:"Working-capital installment estimate: amortized payment compared with operating cash available after expenses and existing debt service."},
  mca: {rate:0,term:0,points:0,explainer:"Merchant cash advance estimate: purchased amount is advance multiplied by factor rate. Estimated remittance is driven by the entered share of monthly receipts; this is not APR or conventional interest."},
  equipment: {rate:10,term:60,points:2,explainer:"Equipment financing estimate: amortized payment on the requested financed amount. Down payment is purchase cost less financing; equipment-specific taxes and fees are excluded."},
  invoice_factoring: {rate:0,term:0,points:0,explainer:"Invoice factoring estimate: advance against invoice face value, reserve withheld and factor fee based on the quoted fee per 30-day period and invoice days outstanding."},
  franchise: {rate:11,term:84,points:3,explainer:"Franchise financing estimate: amortized payment on the requested amount. Franchise fees, buildout costs, working capital and lender-specific conditions must be entered or reviewed separately."},
  credit_repair: {rate:0,term:0,points:0,explainer:"Fundability preparation only. This is not a loan and does not calculate a payment, interest, or approval."},
  debt_consolidation: {rate:13,term:60,points:2,explainer:"Debt-consolidation estimate: amortized replacement payment compared with the current combined monthly payments you enter. It does not prove total lifetime savings."}
};

var fieldSchemas = {
  business_term: [{id:"monthlyExistingDebt",label:"Existing Monthly Business Debt Payments ($)",value:0}],
  sba_7a: [{id:"monthlyExistingDebt",label:"Existing Monthly Business Debt Payments ($)",value:0}],
  sba_504: [
    {id:"bankSharePct",label:"Bank First Mortgage Share of Project (%)",value:50,step:"0.01"},
    {id:"bankRate",label:"Bank First Mortgage Annual Rate (%)",value:8,step:"0.01"},
    {id:"bankTermMonths",label:"Bank First Mortgage Term (months)",value:240,step:"1"},
    {id:"cdcSharePct",label:"CDC / SBA Debenture Share of Project (%)",value:40,step:"0.01"},
    {id:"cdcRate",label:"CDC / SBA Debenture Annual Rate (%)",value:6.5,step:"0.01"},
    {id:"cdcTermMonths",label:"CDC / SBA Debenture Term (months)",value:300,step:"1"}
  ],
  real_estate_loc: [{id:"creditLimit",label:"Total Approved Credit Limit ($)",value:250000},{id:"existingLienBalance",label:"Existing Mortgage / Prior Liens ($)",value:0}],
  heloc: [
    {id:"creditLimit",label:"Total HELOC Credit Limit ($)",value:250000},
    {id:"existingLienBalance",label:"Existing Mortgage / Prior Liens ($)",value:0},
    {id:"repaymentMode",label:"Payment Mode",type:"select",value:"interest_only",options:[["interest_only","Interest-only draw period"],["amortizing","Fully amortizing repayment"]]}
  ],
  dscr: [{id:"monthlyPropertyCosts",label:"Monthly Property Taxes + Insurance + HOA ($)",value:0}],
  fix_flip: [
    {id:"rehabBudget",label:"Rehabilitation Budget ($)",value:50000},
    {id:"softCosts",label:"Closing, Carrying & Other Project Costs ($)",value:10000}
  ],
  working_capital: [{id:"monthlyExistingDebt",label:"Existing Monthly Business Debt Payments ($)",value:0}],
  mca: [
    {id:"factorRate",label:"MCA Factor Rate (example 1.25)",value:1.25,step:"0.001"},
    {id:"holdbackPercent",label:"Estimated Revenue Holdback (%)",value:12.5,step:"0.01"}
  ],
  invoice_factoring: [
    {id:"advancePercent",label:"Invoice Advance Rate (%)",value:85,step:"0.01"},
    {id:"factoringFeePercent",label:"Factor Fee per 30 Days (%)",value:2.5,step:"0.01"},
    {id:"invoiceDays",label:"Expected Days Until Customer Pays",value:45,step:"1"}
  ],
  equipment: [],
  franchise: [{id:"monthlyExistingDebt",label:"Existing Monthly Business Debt Payments ($)",value:0}],
  debt_consolidation: []
};

function byId(id){ return document.getElementById(id); }
function n(id){
  var el=byId(id);
  if(!el || el.value === "") return 0;
  var value=Number(String(el.value).replace(/,/g,""));
  return Number.isFinite(value) ? value : 0;
}
function v(id){ return byId(id) ? byId(id).value : ""; }
function setValue(id,value){ if(byId(id)) byId(id).value=String(value); }
function money(value){
  return Number(value || 0).toLocaleString("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2});
}
function pct(value){ return Number(value || 0).toFixed(2) + "%"; }
function numberFmt(value,digits){
  return Number(value || 0).toLocaleString("en-US",{minimumFractionDigits:digits||2,maximumFractionDigits:digits||2});
}
function payment(principal,annualRate,months){
  if(principal<=0 || months<=0) return 0;
  var r=annualRate/100/12;
  if(r===0) return principal/months;
  var pow=Math.pow(1+r,months);
  return principal*(r*pow)/(pow-1);
}
function amortization(principal,annualRate,months){
  var monthly=payment(principal,annualRate,months);
  var total=monthly*months;
  return {monthly:monthly,total:total,interest:Math.max(0,total-principal)};
}
function escapeHtml(value){
  return String(value==null?"":value).replace(/[&<>"']/g,function(ch){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];
  });
}
function setPairVisible(id,visible,labelText){
  var input=byId(id),label=byId(id+"Label");
  if(input) input.hidden=!visible;
  if(label) label.hidden=!visible;
  if(label && labelText) label.textContent=labelText;
}
function renderSpecificFields(type){
  var host=byId("loanSpecificFields");
  if(!host) return;
  var fields=fieldSchemas[type]||[];
  host.innerHTML=fields.map(function(field){
    if(field.type==="select"){
      return '<div class="loan-specific-field"><label for="'+field.id+'">'+escapeHtml(field.label)+'</label><select id="'+field.id+'">'+field.options.map(function(option){
        return '<option value="'+escapeHtml(option[0])+'">'+escapeHtml(option[1])+'</option>';
      }).join("")+'</select></div>';
    }
    return '<div class="loan-specific-field"><label for="'+field.id+'">'+escapeHtml(field.label)+'</label><input id="'+field.id+'" type="number" min="0" step="'+(field.step||"0.01")+'" value="'+field.value+'" /></div>';
  }).join("");
}
function setLoanDefaults(){
  var type=v("loanType");
  var d=loanDefaults[type]||loanDefaults.business_term;
  setValue("interestRate",d.rate);
  setValue("termMonths",d.term || "");
  setValue("points",d.points);
  renderSpecificFields(type);

  var nonRate=["sba_504","mca","invoice_factoring","credit_repair"].includes(type);
  var nonTerm=["sba_504","mca","invoice_factoring","credit_repair"].includes(type);
  var noPoints=["mca","invoice_factoring","credit_repair"].includes(type);
  var calculatedPrincipal=["sba_504","invoice_factoring","credit_repair"].includes(type);
  ["interestRate","termMonths","points","loanAmount"].forEach(function(id){
    if(byId(id)) byId(id).disabled=false;
  });
  if(byId("interestRate")) byId("interestRate").disabled=nonRate;
  if(byId("termMonths")) byId("termMonths").disabled=nonTerm;
  if(byId("points")) byId("points").disabled=noPoints;
  if(byId("loanAmount")) byId("loanAmount").disabled=calculatedPrincipal;

  var purchaseLabels={
    sba_504:"Total Eligible Project Cost ($)",
    dscr:"Property Purchase Price / Cost ($)",
    fix_flip:"Property Purchase Price (before rehab) ($)",
    invoice_factoring:"Invoice Face Value ($)",
    debt_consolidation:"Current Debt Balances to Consolidate ($)",
    credit_repair:"Funding Target / Project Amount (context only) ($)"
  };
  var loanLabels={
    real_estate_loc:"Current Outstanding Draw ($)",
    heloc:"Current HELOC Draw / Balance ($)",
    mca:"Requested Advance Amount ($)",
    fix_flip:"Total Requested Loan (purchase + rehab) ($)",
    credit_repair:"No loan principal — fundability preparation only",
    invoice_factoring:"Advance amount is calculated from invoice face value"
  };
  if(byId("purchaseAmountLabel")) byId("purchaseAmountLabel").textContent=purchaseLabels[type]||"Project / Purchase Amount ($)";
  if(byId("loanAmountLabel")) byId("loanAmountLabel").textContent=loanLabels[type]||"Requested Loan Principal ($)";
  if(byId("interestRateLabel")) byId("interestRateLabel").textContent=type==="sba_504"?"Enter bank and CDC rates in the tranche fields below":"Illustrative Annual Interest Rate % (replace with quote)";
  if(byId("termMonthsLabel")) byId("termMonthsLabel").textContent="Term in Months (replace with quoted term)";
  if(byId("pointsLabel")) byId("pointsLabel").textContent="Estimated Origination / Points % (not program fees)";
  if(byId("monthlyIncomeLabel")) byId("monthlyIncomeLabel").textContent=type==="dscr"?"Monthly Gross Scheduled Rent ($)":"Monthly Gross Business Revenue ($)";
  if(byId("monthlyDebtLabel")){
    byId("monthlyDebtLabel").textContent=type==="dscr"?"Monthly Operating Expenses (excluding taxes/insurance/HOA and debt service) ($)":type==="debt_consolidation"?"Current Combined Monthly Debt Payments ($)":"Monthly Business Operating Expenses (excluding debt service) ($)";
  }
  var useIncome=["business_term","sba_7a","dscr","working_capital","mca","franchise"].includes(type);
  var useExpenses=["business_term","sba_7a","dscr","working_capital","debt_consolidation","franchise"].includes(type);
  var useCollateral=["real_estate_loc","heloc","dscr","fix_flip","bridge","private_money"].includes(type);
  setPairVisible("monthlyIncome",useIncome);
  setPairVisible("monthlyDebt",useExpenses);
  setPairVisible("collateralValue",useCollateral,type==="fix_flip"?"After-Repair Value / ARV ($)":type==="dscr"?"Property Value for LTV ($)":"Collateral / Property Value ($)");
  if(type==="mca" && byId("monthlyIncome")) byId("monthlyIncomeLabel").textContent="Average Monthly Gross Card / Business Receipts ($)";
}
function formatLoanType(type){
  var names={
    business_term:"Business Term Loan",sba_7a:"SBA 7(a)",sba_504:"SBA 504 / Real Estate",
    real_estate_loc:"Real Estate Line of Credit",heloc:"HELOC / Equity Line",dscr:"DSCR Rental Loan",
    fix_flip:"Fix & Flip / Rehab Loan",bridge:"Bridge Loan",private_money:"Private Money Loan",
    working_capital:"Working Capital Loan",mca:"MCA / Revenue Advance",equipment:"Equipment Financing",
    invoice_factoring:"Invoice Factoring",franchise:"Franchise Financing",credit_repair:"Credit Repair / Fundability Prep",
    debt_consolidation:"Debt Consolidation"
  };
  return names[type]||"Funding Calculation";
}
function quickCalc(type){
  if(byId("loanType")) byId("loanType").value=type;
  setLoanDefaults();
  calculateLoan();
  if(byId("loanResult")) byId("loanResult").scrollIntoView({behavior:"smooth",block:"start"});
}
function nextMove(type){
  if(type==="credit_repair") return "Review the credit reports, utilization, payment history, entity records and documentation. No loan approval is implied.";
  if(type==="invoice_factoring") return "Verify invoice validity, debtor credit, assignment restrictions, disputes, dilution, concentration and recourse terms.";
  if(type==="mca") return "Compare the factor rate, total purchased amount, daily/weekly remittance, reconciliation rights and cash-flow impact before proceeding.";
  if(type==="sba_504" || type==="sba_7a") return "Confirm program eligibility, use of proceeds, injection, SBA/CDC or lender fees, collateral and the lender's final amortization schedule.";
  if(type==="dscr") return "Verify executed lease or market rent, vacancy, taxes, insurance, HOA, management, repairs and lender PITIA/DSCR method.";
  if(type==="fix_flip") return "Verify purchase contract, rehab scope, contingency, draw schedule, ARV comps, title, insurance and a funded exit strategy.";
  if(type==="bridge" || type==="private_money") return "Document collateral, payoff, maturity, extension provisions, points, exit source and balloon payoff.";
  if(type==="heloc" || type==="real_estate_loc") return "Confirm line limit, current draw, existing liens, draw period, interest-only period, reset terms and maturity.";
  if(type==="debt_consolidation") return "Compare payoff statements, current APRs, remaining terms, fees and total dollars paid—not just the new monthly payment.";
  return "Verify lender quote, full document set, cash flow, existing obligations, fees, collateral and repayment/exit plan.";
}
function showResult(title,stats,notes,warning){
  var box=byId("loanResult");
  box.innerHTML='<h3>📊 '+escapeHtml(title)+'</h3><div class="calc-result-grid">'+stats.map(function(item){
    return '<div class="calc-result-item"><span>'+escapeHtml(item[0])+'</span><strong>'+escapeHtml(item[1])+'</strong></div>';
  }).join("")+'</div><p><b>Model:</b> '+escapeHtml(notes.model)+'</p><p><b>What this means:</b> '+escapeHtml(notes.meaning)+'</p><p><b>Next step:</b> '+escapeHtml(notes.next)+'</p>'+(warning?'<p class="review"><b>Check:</b> '+escapeHtml(warning)+'</p>':"")+'<p class="small">Screening estimate only. This is not an approval, commitment, appraisal, legal/tax conclusion or guarantee of funding. Confirm lender methodology and actual documents.</p>';
}
function calculateLoan(){
  var type=v("loanType");
  var project=n("purchaseAmount"),requested=n("loanAmount"),rate=n("interestRate"),months=n("termMonths"),points=n("points");
  var income=n("monthlyIncome"),expenses=n("monthlyDebt"),collateral=n("collateralValue");
  var principal=requested,monthly=0,fees=0,totalInterest=0,totalPayback=0,cashNeeded=0,ltv=null,dscr=null,warning="",model="",meaning="",stats=[];
  var other={};
  if(type==="credit_repair"){
    fundingData={type:type,purchase:project,loan:0,rate:0,months:0,points:0,monthly:0,fees:0,totalInterest:0,totalPayback:0,cashNeeded:0,ltv:null,dscr:null,readiness:"PREPARATION ONLY",details:"No loan payment is calculated."};
    showResult("Fundability Preparation — Not a Loan",[
      ["Loan principal","Not applicable"],["Monthly payment","Not applicable"],["Interest / APR","Not applicable"],["Funding decision","No approval or score guarantee"]
    ],{model:"Credit and documentation readiness workflow",meaning:"This pathway is not a credit product or loan offer. No credit score increase, approval or funding result is promised.",next:nextMove(type)},"Do not present this as financing or a loan calculation.");
    return;
  }
  if(type!=="sba_504" && type!=="invoice_factoring" && (!Number.isFinite(principal)||principal<=0)){
    showResult("Input Needed",[["Requested amount","Enter an amount above $0"]],{model:"No calculation performed",meaning:"Enter a positive loan or advance amount.",next:"Complete the required inputs and calculate again."},"Loan amount must be greater than zero.");
    return;
  }
  if(["business_term","sba_7a","working_capital","equipment","franchise","debt_consolidation"].includes(type)){
    if(months<=0 || rate<0){warning="Enter a positive term and a valid non-negative annual rate.";return showResult("Check Inputs",[["Term / rate","Invalid"]],{model:"Amortizing installment loan",meaning:"Term must be greater than zero and rate cannot be negative.",next:"Correct the loan terms."},warning);}
    var amort=amortization(principal,rate,months);
    monthly=amort.monthly;totalInterest=amort.interest;totalPayback=amort.total;
    fees=principal*points/100;
    cashNeeded=Math.max(0,project-principal)+fees;
    model="Fully amortizing monthly principal-and-interest payment";
    stats.push(["Monthly principal + interest",money(monthly)],["Total scheduled payments",money(totalPayback)],["Estimated interest over term",money(totalInterest)],["Estimated points / origination fee",money(fees)],["Estimated project cash gap + fee",money(cashNeeded)]);
    if(type==="equipment"){
      var down=Math.max(0,project-principal);
      stats.push(["Estimated equipment down payment",money(down)],["Financed share",project>0?pct(principal/project*100):"Not available"]);
      meaning="Payment is calculated on requested principal. Down payment is purchase cost less the requested financing; taxes, title, delivery and dealer fees are excluded.";
    } else if(type==="debt_consolidation"){
      var currentPayment=expenses;
      var savings=currentPayment-monthly;
      stats.push(["Current combined monthly debt payments",money(currentPayment)],["Estimated monthly payment change",money(savings)]);
      if(savings>0){var breakEven=fees/savings;stats.push(["Points break-even (months)",numberFmt(breakEven,1)]);}
      meaning="Monthly change compares the new estimated payment with your current combined payment. Lifetime savings cannot be determined without current APRs, payoff dates, fees and remaining terms.";
    } else {
      if(income>0){
        var operatingCash=income-expenses;
        var existing=n("monthlyExistingDebt");
        var coverageBase=existing+monthly;
        dscr=coverageBase>0?operatingCash/coverageBase:null;
        stats.push(["Monthly revenue less operating expenses",money(operatingCash)],["Existing monthly business debt",money(existing)],["Cash-flow coverage of existing + new debt",dscr===null?"Not available":numberFmt(dscr,2)+"x"]);
        if(operatingCash<0) warning="Entered operating expenses exceed monthly gross revenue.";
        else if(dscr!==null && dscr<1) warning="Entered operating cash flow is below combined monthly debt service. This is a cash-flow warning, not a lender decision.";
      }
      meaning="The loan payment is amortized monthly. If revenue and expense inputs are provided, coverage uses revenue less operating expenses divided by existing debt plus the new payment.";
    }
    if(type==="business_term") meaning=meaning||"Fixed monthly principal and interest based on the entered rate and term.";
    if(type==="sba_7a") meaning="Amortized payment using your entered rate and term. SBA guaranty fees, eligibility, maximum maturities and lender-specific adjustments are not included.";
    if(type==="working_capital") meaning=meaning||"Amortized monthly repayment; compare with cash remaining after ordinary operating expenses and existing business debt.";
    if(type==="franchise") meaning="Amortized monthly repayment on the entered loan amount. Franchise royalty, advertising, buildout and working-capital obligations are not included unless entered as expenses.";
    other={monthly:monthly,totalInterest:totalInterest,totalPayback:totalPayback,fees:fees,cashNeeded:cashNeeded,dscr:dscr};
  } else if(type==="sba_504"){
    var bankPct=n("bankSharePct"),cdcPct=n("cdcSharePct"),bankRate=n("bankRate"),cdcRate=n("cdcRate"),bankMonths=n("bankTermMonths"),cdcMonths=n("cdcTermMonths");
    if(project<=0 || bankPct<0 || cdcPct<0 || bankPct+cdcPct>100 || bankMonths<=0 || cdcMonths<=0 || bankRate<0 || cdcRate<0){
      return showResult("Check SBA 504 Inputs",[["Project cost",money(project)],["Bank + CDC shares",pct(bankPct+cdcPct)]],{model:"Two-tranche amortization",meaning:"Project cost must be positive, share percentages must total no more than 100%, both terms must be positive and rates cannot be negative.",next:"Correct the project cost, tranche shares, rates and terms."},"Shares above 100% or invalid tranche terms. Default shares are illustrative only, not a program rule or lender quote.");
    }
    var bankPrincipal=project*bankPct/100,cdcPrincipal=project*cdcPct/100;
    var bankAmort=amortization(bankPrincipal,bankRate,bankMonths),cdcAmort=amortization(cdcPrincipal,cdcRate,cdcMonths);
    principal=bankPrincipal+cdcPrincipal;monthly=bankAmort.monthly+cdcAmort.monthly;
    totalInterest=bankAmort.interest+cdcAmort.interest;totalPayback=bankAmort.total+cdcAmort.total;fees=principal*points/100;
    var injection=Math.max(0,project-principal);
    cashNeeded=injection+fees;
    stats.push(["Bank first mortgage",money(bankPrincipal)],["Bank monthly payment",money(bankAmort.monthly)],["CDC / SBA debenture",money(cdcPrincipal)],["CDC monthly payment",money(cdcAmort.monthly)],["Combined monthly principal + interest",money(monthly)],["Calculated borrower injection",money(injection)],["Estimated tranche origination points",money(fees)],["Estimated total interest",money(totalInterest)]);
    model="Two separate amortizing loans; payments summed.";
    meaning="Bank and CDC portions use separate rates and terms. Actual project injection, eligible costs, tranche allocation, CDC fees, SBA fees and closing costs must be confirmed with the lender/CDC.";
    other={monthly:monthly,totalInterest:totalInterest,totalPayback:totalPayback,fees:fees,cashNeeded:cashNeeded,bankPrincipal:bankPrincipal,cdcPrincipal:cdcPrincipal};
  } else if(type==="real_estate_loc"){
    var limit=n("creditLimit")||principal,priorLocLiens=n("existingLienBalance");
    if(limit<principal) warning="Outstanding draw is greater than the credit limit entered.";
    monthly=principal*rate/100/12;totalInterest=monthly*months;totalPayback=totalInterest+principal;
    fees=principal*points/100;cashNeeded=Math.max(0,project-principal)+fees;ltv=collateral>0?(limit+priorLocLiens)/collateral*100:null;
    stats.push(["Outstanding draw",money(principal)],["Approved line limit entered",money(limit)],["Existing mortgage / prior liens",money(priorLocLiens)],["Unused line availability",money(Math.max(0,limit-principal))],["Monthly interest-only payment",money(monthly)],["Principal due at maturity (balloon)",money(principal)],["Estimated interest over entered term",money(totalInterest)],["Combined line exposure LTV",ltv===null?"Not available":pct(ltv)],["Estimated points / origination fee",money(fees)]);
    model="Revolving line; interest-only on outstanding draw.";
    meaning="No principal amortization is assumed. The full drawn balance remains due at maturity unless the lender renews, extends or converts the line. Unused credit is not charged interest in this estimate.";
  } else if(type==="heloc"){
    var helocLimit=n("creditLimit")||principal,priorLiens=n("existingLienBalance"),mode=v("repaymentMode");
    ltv=collateral>0?(helocLimit+priorLiens)/collateral*100:null;
    if(helocLimit<principal) warning="Outstanding HELOC draw is greater than the credit limit entered.";
    if(months<=0 || rate<0) return showResult("Check HELOC Inputs",[["Term / rate","Invalid"]],{model:"HELOC draw or repayment phase",meaning:"Enter a positive term and a non-negative rate.",next:"Correct the terms."},"Invalid rate or term.");
    if(mode==="amortizing"){
      var h=amortization(principal,rate,months);monthly=h.monthly;totalInterest=h.interest;totalPayback=h.total;
      model="Fully amortizing repayment on the outstanding HELOC draw.";
      meaning="This models a fixed amortization term. Actual HELOCs may have variable rates, draw periods, repayment periods and minimum-payment rules.";
    } else {
      monthly=principal*rate/100/12;totalInterest=monthly*months;totalPayback=totalInterest+principal;
      model="Interest-only payment during draw period.";
      meaning="Interest is estimated on the current outstanding balance. The balance remains due or must convert to repayment at the end of the draw period.";
    }
    fees=principal*points/100;
    stats.push(["Outstanding draw",money(principal)],["Credit limit",money(helocLimit)],["Unused availability",money(Math.max(0,helocLimit-principal))],["Existing mortgage / prior liens",money(priorLiens)],["Combined loan-to-value (CLTV)",ltv===null?"Not available":pct(ltv)],["Estimated monthly payment",money(monthly)],["Estimated points / origination fee",money(fees)]);
  } else if(type==="dscr"){
    if(months<=0 || rate<0) return showResult("Check DSCR Inputs",[["Term / rate","Invalid"]],{model:"Amortizing rental-property mortgage",meaning:"Enter a positive term and non-negative rate.",next:"Correct the terms."},"Invalid rate or term.");
    var dscrAmort=amortization(principal,rate,months);
    var noi=income-expenses,propertyCosts=n("monthlyPropertyCosts"),pitia=dscrAmort.monthly+propertyCosts;
    monthly=pitia;totalInterest=dscrAmort.interest;totalPayback=dscrAmort.total+propertyCosts*months;fees=principal*points/100;
    ltv=collateral>0?principal/collateral*100:null;
    dscr=pitia>0?noi/pitia:null;cashNeeded=Math.max(0,project-principal)+fees;
    stats.push(["Gross scheduled monthly rent",money(income)],["Monthly operating expenses",money(expenses)],["Monthly net operating income (NOI)",money(noi)],["Monthly principal + interest",money(dscrAmort.monthly)],["Monthly taxes + insurance + HOA entered",money(propertyCosts)],["Monthly PITIA-style debt service",money(pitia)],["DSCR (NOI ÷ debt service)",dscr===null?"Not available":numberFmt(dscr,2)+"x"],["Loan-to-value (LTV)",ltv===null?"Not available":pct(ltv)],["Estimated points / origination fee",money(fees)]);
    model="Amortizing loan payment plus entered monthly taxes, insurance and HOA; DSCR = NOI ÷ monthly debt service.";
    meaning="NOI is gross scheduled rent less entered operating expenses. Enter vacancy, management, repairs and other property operating expenses in the expense field. Lender DSCR definitions can differ.";
    if(noi<0) warning="Net operating income is negative using the entered figures.";
  } else if(type==="fix_flip"){
    var rehab=n("rehabBudget"),soft=n("softCosts"),projectCost=project+rehab+soft,arv=collateral;
    if(months<=0 || rate<0) return showResult("Check Fix & Flip Inputs",[["Term / rate","Invalid"]],{model:"Interest-only rehab loan",meaning:"Enter a positive term and non-negative rate.",next:"Correct the terms."},"Invalid rate or term.");
    monthly=principal*rate/100/12;totalInterest=monthly*months;totalPayback=principal+totalInterest;fees=principal*points/100;
    cashNeeded=Math.max(0,projectCost-principal)+fees;ltv=arv>0?principal/arv*100:null;
    var ltc=projectCost>0?principal/projectCost*100:null;
    stats.push(["Purchase price",money(project)],["Rehabilitation budget",money(rehab)],["Soft / carrying / closing costs",money(soft)],["Total project cost",money(projectCost)],["Loan-to-cost (LTC)",ltc===null?"Not available":pct(ltc)],["Loan-to-ARV (LTARV)",ltv===null?"Not available":pct(ltv)],["Monthly interest-only at full balance",money(monthly)],["Principal balloon at maturity",money(principal)],["Estimated points / origination fee",money(fees)],["Estimated cash/equity gap + points",money(cashNeeded)]);
    model="Interest-only on the full requested balance; LTC and LTARV are calculated separately.";
    meaning="Assumes the entire balance is outstanding for the full term. Actual rehab loans may fund in stages, hold back rehab proceeds, and calculate interest on amounts advanced. ARV is an input, not an appraisal.";
  } else if(type==="bridge" || type==="private_money"){
    if(months<=0 || rate<0) return showResult("Check Loan Inputs",[["Term / rate","Invalid"]],{model:"Interest-only balloon loan",meaning:"Enter a positive term and non-negative rate.",next:"Correct the terms."},"Invalid rate or term.");
    monthly=principal*rate/100/12;totalInterest=monthly*months;totalPayback=principal+totalInterest;fees=principal*points/100;
    ltv=collateral>0?principal/collateral*100:null;cashNeeded=Math.max(0,project-principal)+fees;
    stats.push(["Monthly interest-only payment",money(monthly)],["Total interest over entered term",money(totalInterest)],["Principal due at maturity (balloon)",money(principal)],["Estimated payoff incl. modeled interest",money(totalPayback)],["Collateral LTV",ltv===null?"Not available":pct(ltv)],["Estimated points / origination fee",money(fees)],["Estimated project cash gap + points",money(cashNeeded)]);
    model="Interest-only monthly payments; full principal due at maturity.";
    meaning="This is a balloon-payment model, not a fully amortizing mortgage. Confirm payment frequency, points, extensions, default rate and exit/refinance conditions.";
  } else if(type==="mca"){
    var factor=n("factorRate"),holdback=n("holdbackPercent");
    if(factor<1 || holdback<=0 || holdback>100 || income<=0) return showResult("Check MCA Inputs",[["Factor rate",numberFmt(factor,3)],["Holdback / monthly receipts",pct(holdback)],["Monthly gross receipts",money(income)]],{model:"Purchased-future-receivables estimate",meaning:"Factor rate must be at least 1.00, holdback must be above 0% and no more than 100%, and monthly receipts must be positive.",next:"Enter a valid advance, factor rate, holdback percentage and monthly receipts."},"MCA inputs are incomplete or invalid.");
    var payback=principal*factor,cost=payback-principal,monthlyRemit=income*holdback/100,estimatedMonths=payback/monthlyRemit;
    monthly=monthlyRemit;totalPayback=payback;totalInterest=0;fees=cost;cashNeeded=0;
    stats.push(["Gross advance",money(principal)],["Factor rate",numberFmt(factor,3)+"x"],["Total purchased amount / payback",money(payback)],["Estimated factor cost",money(cost)],["Estimated monthly remittance at steady receipts",money(monthlyRemit)],["Estimated duration at entered receipts",numberFmt(estimatedMonths,1)+" months"]);
    model="Advance × factor rate; estimated remittance = monthly receipts × holdback percentage.";
    meaning="This is not an APR or amortized-interest calculation. Actual daily/weekly remittances, reconciliation rules, fees, minimums and payoff amount must be checked in the contract.";
  } else if(type==="invoice_factoring"){
    var face=project,advanceRate=n("advancePercent"),factorFee=n("factoringFeePercent"),days=n("invoiceDays");
    if(face<=0 || advanceRate<=0 || advanceRate>100 || factorFee<0 || days<=0) return showResult("Check Factoring Inputs",[["Invoice face value",money(face)],["Advance rate",pct(advanceRate)],["Fee per 30 days",pct(factorFee)],["Days outstanding",numberFmt(days,0)]],{model:"Invoice purchase / advance estimate",meaning:"Enter a positive invoice amount, advance rate up to 100%, non-negative fee and positive days outstanding.",next:"Correct the invoice details."},"Invoice factoring inputs are invalid.");
    var advance=face*advanceRate/100,reserve=face-advance,factorCost=face*(factorFee/100)*(days/30),netInvoice=face-factorCost,netUpfront=advance;
    principal=advance;monthly=0;totalInterest=0;totalPayback=netInvoice;fees=factorCost;cashNeeded=0;
    stats.push(["Invoice face value",money(face)],["Gross advance at entered rate",money(advance)],["Reserve withheld",money(reserve)],["Estimated factoring fee",money(factorCost)],["Cash advanced upfront (before other fees)",money(netUpfront)],["Estimated total proceeds after factor fee",money(netInvoice)],["Reserve after fee (estimated)",money(Math.max(0,reserve-factorCost))]);
    model="Invoice face × advance rate; fee = invoice face × fee per 30 days × days outstanding ÷ 30.";
    meaning="Assumes a simple, non-compounding fee and no separate wire, verification, legal, dilution, reserve or recourse charges. Factor contracts can calculate fees differently; use the actual quote.";
  }
  if(ltv!==null && !stats.some(function(row){return (row[0].toLowerCase().includes("ltv") || row[0].toLowerCase().includes("ltarv") || row[0].toLowerCase().includes("cltv"));})){
    stats.push(["Collateral LTV",pct(ltv)]);
  }
  if(!stats.length) stats.push(["Calculation","Review entered product inputs"]);
  fundingData={
    type:type,purchase:project,loan:principal,rate:rate,months:months,points:points,income:income,debt:expenses,
    collateral:collateral,monthly:monthly,fees:fees,totalPayback:totalPayback,totalInterest:totalInterest,
    cashNeeded:cashNeeded,ltv:ltv,dscr:dscr,readiness:"ESTIMATE ONLY — NOT A LENDER DECISION",
    details:stats.map(function(row){return row[0]+": "+row[1];}).join("\n"),
    model:model,meaning:meaning
  };
  showResult("Funding Estimate — "+formatLoanType(type),stats,{
    model:model,
    meaning:meaning || loanDefaults[type].explainer,
    next:nextMove(type)
  },warning);
}
function packageText(){
  if(!fundingData.type) calculateLoan();
  return "RO’Lyfe Funding Calculation Preview\n\nClient: "+v("clientName")+
    "\nEmail: "+v("clientEmail")+"\nPhone: "+v("clientPhone")+
    "\nBusiness / Entity: "+v("businessName")+"\nProject / Property: "+v("propertyAddress")+
    "\n\nLoan Type: "+formatLoanType(fundingData.type||v("loanType"))+
    "\nProject / Invoice Amount: "+money(fundingData.purchase)+
    "\nCalculated / Requested Principal: "+money(fundingData.loan)+
    "\nAnnual rate input: "+(fundingData.rate||0)+"%"+
    "\nTerm input: "+(fundingData.months||"Product-specific")+" months"+
    "\nEstimated monthly payment / remittance: "+money(fundingData.monthly)+
    "\nEstimated fees / factor fee: "+money(fundingData.fees)+
    "\nEstimated interest: "+money(fundingData.totalInterest)+
    "\nEstimated total payback: "+money(fundingData.totalPayback)+
    "\nLTV / leverage: "+(fundingData.ltv===null?"Not applicable":pct(fundingData.ltv))+
    "\nDSCR / cash-flow coverage: "+(fundingData.dscr===null?"Not calculated":numberFmt(fundingData.dscr,2)+"x")+
    "\n\nCalculation detail:\n"+(fundingData.details||"Not calculated")+
    "\n\nNotes:\n"+v("fundingNotes")+
    "\n\nNext Step:\nReview lender quote, source documents, borrower capacity, collateral and exit strategy before submission."+
    "\n\nDisclosure: Screening estimate only; not an approval, loan commitment, legal/tax opinion or guarantee of funding.";
}
function copyFundingPackage(){
  var content=packageText();
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(content).then(function(){alert("Funding calculation copied.");}).catch(function(){alert("Clipboard access was blocked. Select and copy the package manually.");});
  else alert("Clipboard is unavailable in this browser.");
}
function emailFundingPackage(){
  window.open("mailto:richman@rootoflyfe.com?subject=RO’Lyfe Funding Calculation&body="+encodeURIComponent(packageText()),"_blank");
}
function generateFundingPDF(){
  if(!fundingData.type) calculateLoan();
  if(!window.jspdf || !window.jspdf.jsPDF){alert("PDF library did not load. Use Copy Package instead.");return;}
  var doc=new window.jspdf.jsPDF({unit:"pt",format:"letter"}),y=44;
  function add(text,bold){
    if(y>720){doc.addPage();y=44;}
    doc.setFont("helvetica",bold?"bold":"normal");
    doc.splitTextToSize(String(text||""),520).forEach(function(line){doc.text(line,40,y);y+=16;});
  }
  doc.setFontSize(18);add("RO’Lyfe Funding Calculation Preview",true);y+=8;doc.setFontSize(11);
  add("Prepared for internal funding discussion — not a lender decision.");
  add("Client: "+v("clientName"));add("Business / Entity: "+v("businessName"));add("Email: "+v("clientEmail"));add("Phone: "+v("clientPhone"));add("Project / Property: "+v("propertyAddress"));y+=8;
  add("CALCULATION",true);add(formatLoanType(fundingData.type));
  add(fundingData.details||"No calculation details available.");y+=8;
  add("NOTES",true);add(v("fundingNotes")||"None entered.");y+=8;
  add("DOCUMENT CHECKLIST",true);add("ID, entity documents, EIN letter, operating agreement, bank statements, tax returns if requested, project details, purchase agreement, scope/budget, insurance, title contact, credit review and exit strategy.");
  y+=8;add("DISCLOSURE",true);add("This is an estimate for internal screening. It is not a commitment, approval, appraisal, legal or tax advice, or guarantee of financing. Actual lender terms, program requirements, fees, underwriting and closing costs control.");
  doc.save("RO-Lyfe-Funding-Calculation-Preview.pdf");
}
function resetCalc(){
  ["purchaseAmount","loanAmount","monthlyIncome","monthlyDebt","collateralValue"].forEach(function(id){if(byId(id)) byId(id).value="";});
  setLoanDefaults();
  byId("loanResult").innerHTML="<h3>📊 Funding Result</h3><p>Inputs reset. Enter the deal figures and calculate again.</p>";
  fundingData={};
}
function openModal(url){byId("modalFrame").src=url;byId("modal").classList.add("active");}
function closeModal(){byId("modal").classList.remove("active");byId("modalFrame").src="";}
function openBookingPopup(){openModal(LINKS.booking);}
function openDocPopup(type){openModal(type==="writer"?LINKS.writer:LINKS.contract);}
function openJamalPopup(){window.open(LINKS.jamal+"?embedMode=popup&parentURL="+encodeURIComponent(window.location.href),"Jamal","scrollbars=yes,toolbar=no,width=760,height=620");}
function saveLead(){
  if(!fundingData.type) calculateLoan();
  var lead={id:Date.now(),client:v("clientName")||"Unnamed Lead",business:v("businessName"),loanType:formatLoanType(fundingData.type||v("loanType")),loan:fundingData.loan||0,readiness:fundingData.readiness||"Estimate only",date:new Date().toLocaleString()};
  leads.unshift(lead);localStorage.setItem("rolyfeFundingLeads",JSON.stringify(leads));renderLeads();
}
function deleteLead(id){leads=leads.filter(function(item){return item.id!==id;});localStorage.setItem("rolyfeFundingLeads",JSON.stringify(leads));renderLeads();}
function renderLeads(){
  var out=byId("leadPipeline");if(!out)return;
  out.innerHTML=leads.map(function(lead){
    return '<div class="pipeline-item"><h3>'+escapeHtml(lead.client)+'</h3><p>'+escapeHtml(lead.business||"")+'<br>'+escapeHtml(lead.loanType)+'<br>Principal / Advance: '+money(lead.loan)+'<br>'+escapeHtml(lead.readiness)+'<br>'+escapeHtml(lead.date)+'</p><button class="red" onclick="deleteLead('+Number(lead.id)+')">Delete</button></div>';
  }).join("");
}
window.addEventListener("load",function(){
  setLoanDefaults();
  renderLeads();
  setTimeout(function(){
    var toast=document.createElement("div");toast.className="toast";toast.textContent="Jamal is ready. Review the math, then ask for execution.";
    document.body.appendChild(toast);setTimeout(function(){toast.remove();},5000);
  },800);
});
window.setLoanDefaults=setLoanDefaults;
window.quickCalc=quickCalc;
window.calculateLoan=calculateLoan;
window.resetCalc=resetCalc;
window.openBookingPopup=openBookingPopup;
window.openDocPopup=openDocPopup;
window.openJamalPopup=openJamalPopup;
window.closeModal=closeModal;
window.copyFundingPackage=copyFundingPackage;
window.emailFundingPackage=emailFundingPackage;
window.generateFundingPDF=generateFundingPDF;
window.saveLead=saveLead;
window.deleteLead=deleteLead;
