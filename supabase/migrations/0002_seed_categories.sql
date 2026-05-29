-- Default category tree benchmarked off YNAB / Quicken. Fully editable later.
-- Idempotent: only seeds when the categories table is empty.

do $$
begin
  if exists (select 1 from public.categories) then
    return;
  end if;

  -- Level 1 (groups)
  insert into public.categories (name, type, sort_order) values
    ('Income', 'income', 0),
    ('Housing', 'expense', 10),
    ('Utilities', 'expense', 20),
    ('Transportation', 'expense', 30),
    ('Food', 'expense', 40),
    ('Health', 'expense', 50),
    ('Insurance', 'expense', 60),
    ('Personal', 'expense', 70),
    ('Entertainment', 'expense', 80),
    ('Family & Kids', 'expense', 90),
    ('Pets', 'expense', 100),
    ('Giving', 'expense', 110),
    ('Debt Payments', 'expense', 120),
    ('Savings', 'expense', 130),
    ('Miscellaneous', 'expense', 140);

  -- Level 2 (categories), parent matched by level-1 name
  insert into public.categories (parent_id, name, type, sort_order)
  select p.id, x.name, p.type, x.ord
  from public.categories p
  join (values
    ('Income', 'Salary - Blake', 0),
    ('Income', 'Salary - Amanda', 1),
    ('Income', 'Bonus', 2),
    ('Income', 'Interest & Dividends', 3),
    ('Income', 'Reimbursements', 4),
    ('Income', 'Other Income', 5),
    ('Housing', 'Mortgage / Rent', 0),
    ('Housing', 'Property Tax', 1),
    ('Housing', 'Home Insurance', 2),
    ('Housing', 'HOA Dues', 3),
    ('Housing', 'Repairs & Maintenance', 4),
    ('Housing', 'Furnishings', 5),
    ('Utilities', 'Electricity', 0),
    ('Utilities', 'Natural Gas', 1),
    ('Utilities', 'Water & Sewer', 2),
    ('Utilities', 'Trash & Recycling', 3),
    ('Utilities', 'Internet', 4),
    ('Utilities', 'Mobile Phone', 5),
    ('Utilities', 'Streaming Services', 6),
    ('Transportation', 'Auto Loan', 0),
    ('Transportation', 'Fuel', 1),
    ('Transportation', 'Auto Insurance', 2),
    ('Transportation', 'Maintenance & Repairs', 3),
    ('Transportation', 'Registration & Fees', 4),
    ('Transportation', 'Parking & Tolls', 5),
    ('Food', 'Groceries', 0),
    ('Food', 'Restaurants', 1),
    ('Food', 'Coffee Shops', 2),
    ('Health', 'Doctor', 0),
    ('Health', 'Dentist', 1),
    ('Health', 'Pharmacy', 2),
    ('Health', 'Vision', 3),
    ('Insurance', 'Life Insurance', 0),
    ('Insurance', 'Disability Insurance', 1),
    ('Insurance', 'Umbrella Policy', 2),
    ('Personal', 'Clothing', 0),
    ('Personal', 'Haircare', 1),
    ('Personal', 'Gym & Fitness', 2),
    ('Personal', 'Subscriptions', 3),
    ('Entertainment', 'Movies & Events', 0),
    ('Entertainment', 'Hobbies', 1),
    ('Entertainment', 'Travel & Vacation', 2),
    ('Family & Kids', 'Childcare', 0),
    ('Family & Kids', 'School & Tuition', 1),
    ('Family & Kids', 'Activities', 2),
    ('Family & Kids', 'Allowance', 3),
    ('Pets', 'Pet Food', 0),
    ('Pets', 'Veterinary', 1),
    ('Pets', 'Pet Supplies', 2),
    ('Giving', 'Charity', 0),
    ('Giving', 'Gifts', 1),
    ('Debt Payments', 'Credit Card', 0),
    ('Debt Payments', 'Student Loan', 1),
    ('Debt Payments', 'Personal Loan', 2),
    ('Savings', 'Emergency Fund', 0),
    ('Savings', 'Retirement', 1),
    ('Savings', 'Investments', 2),
    ('Savings', 'College Fund', 3),
    ('Miscellaneous', 'Bank Fees', 0),
    ('Miscellaneous', 'Taxes', 1),
    ('Miscellaneous', 'Other', 2)
  ) as x(parent, name, ord) on x.parent = p.name and p.depth = 1;

  -- Level 3 (sub-categories), parent matched by unique level-2 names
  insert into public.categories (parent_id, name, type, sort_order)
  select p.id, x.name, p.type, x.ord
  from public.categories p
  join (values
    ('Repairs & Maintenance', 'Plumbing', 0),
    ('Repairs & Maintenance', 'Electrical', 1),
    ('Repairs & Maintenance', 'Landscaping', 2),
    ('Repairs & Maintenance', 'Appliances', 3),
    ('Groceries', 'Supermarket', 0),
    ('Groceries', 'Warehouse Club', 1),
    ('Groceries', 'Farmers Market', 2),
    ('Travel & Vacation', 'Flights', 0),
    ('Travel & Vacation', 'Lodging', 1),
    ('Travel & Vacation', 'Activities & Dining', 2)
  ) as x(parent, name, ord) on x.parent = p.name and p.depth = 2;
end;
$$;
