import { supabase } from '../lib/supabase'

export const setupDatabase = async () => {
  console.log('Setting up Bettroi Hisab database...')

  try {
    // Create projects
    const { data: projects, error: projectsError } = await supabase
      .from('bettroi_projects')
      .insert([
        {
          name: 'Linkist',
          total_value: 240000, // ₹2,00,000 received + ₹40,000 billed
          status: 'active',
          client_name: 'Linkist Client',
          notes: 'Billed ₹40,000 (get paid by 15th), Received ₹2,00,000'
        },
        {
          name: 'Neuro (Neurosense)',
          total_value: 275000,
          status: 'in_process',
          client_name: 'Neurosense',
          notes: 'Total value ₹2,75,000, Received ₹1,10,000 (40%), Milestones: M2=20%=55K, M3=30%=82.5K, M4=10%=27.5K'
        },
        {
          name: '4C',
          total_value: 150000,
          status: 'pending',
          client_name: '4C Client',
          notes: 'Proposal ₹1,50,000, Received ₹50,000'
        },
        {
          name: 'Headz',
          total_value: 0, // No value set yet, pending PO
          status: 'pending',
          client_name: 'Headz Client',
          notes: 'Pending PO from Harita, need to send 50% invoice after PO'
        },
        {
          name: 'Various',
          total_value: 280000,
          status: 'active',
          client_name: 'Multiple Clients',
          notes: '₹2,80,000 received by hand on 20th Nov'
        }
      ])
      .select()

    if (projectsError) {
      console.error('Error creating projects:', projectsError)
      return
    }

    console.log('Projects created:', projects)

    if (!projects || projects.length === 0) {
      console.error('No projects were created')
      return
    }

    // Find project IDs
    const linkistProject = projects.find(p => p.name === 'Linkist')
    const neuroProject = projects.find(p => p.name === 'Neuro (Neurosense)')
    const fourCProject = projects.find(p => p.name === '4C')
    const headzProject = projects.find(p => p.name === 'Headz')
    const variousProject = projects.find(p => p.name === 'Various')

    // Create transactions
    const transactions = []

    // Linkist transactions
    if (linkistProject) {
      transactions.push(
        {
          project_id: linkistProject.id,
          date: '2024-11-15',
          type: 'payment_received',
          amount: 200000,
          mode: 'bank',
          notes: 'Initial payment received'
        },
        {
          project_id: linkistProject.id,
          date: '2024-12-01',
          type: 'bill_sent',
          amount: 40000,
          mode: 'bank',
          notes: 'Bill sent, payment due by 15th'
        }
      )
    }

    // Neuro transactions
    if (neuroProject) {
      transactions.push({
        project_id: neuroProject.id,
        date: '2024-10-15',
        type: 'payment_received',
        amount: 110000,
        mode: 'bank',
        notes: 'Received 40% of project value'
      })
    }

    // 4C transactions
    if (fourCProject) {
      transactions.push({
        project_id: fourCProject.id,
        date: '2024-11-01',
        type: 'payment_received',
        amount: 50000,
        mode: 'bank',
        notes: 'Partial payment received'
      })
    }

    // Various transactions
    if (variousProject) {
      transactions.push({
        project_id: variousProject.id,
        date: '2024-11-20',
        type: 'by_hand',
        amount: 280000,
        mode: 'by_hand',
        notes: 'Received by hand on 20th Nov'
      })
    }

    const { error: transactionsError } = await supabase
      .from('bettroi_transactions')
      .insert(transactions)

    if (transactionsError) {
      console.error('Error creating transactions:', transactionsError)
      return
    }

    console.log('Transactions created')

    // Create milestones for Neuro project
    if (neuroProject) {
      const { error: milestonesError } = await supabase
        .from('bettroi_milestones')
        .insert([
          {
            project_id: neuroProject.id,
            name: 'M1 - Initial Development',
            percentage: 40,
            amount: 110000,
            status: 'paid',
            notes: 'Completed and paid'
          },
          {
            project_id: neuroProject.id,
            name: 'M2 - Core Features',
            percentage: 20,
            amount: 55000,
            status: 'pending',
            notes: '20% milestone pending'
          },
          {
            project_id: neuroProject.id,
            name: 'M3 - Integration',
            percentage: 30,
            amount: 82500,
            status: 'pending',
            notes: '30% milestone pending'
          },
          {
            project_id: neuroProject.id,
            name: 'M4 - Final Deployment',
            percentage: 10,
            amount: 27500,
            status: 'pending',
            notes: '10% final milestone'
          }
        ])

      if (milestonesError) {
        console.error('Error creating milestones:', milestonesError)
      } else {
        console.log('Milestones created for Neuro project')
      }
    }

    // Create action items
    const actionItems = []

    if (headzProject) {
      actionItems.push({
        project_id: headzProject.id,
        description: 'Send invoice for advance by 15th Jan',
        due_date: '2024-01-15',
        status: 'pending'
      })
    }

    if (neuroProject) {
      actionItems.push({
        project_id: neuroProject.id,
        description: 'Follow up to get advance for M2',
        due_date: '2024-12-31',
        status: 'pending'
      })
    }

    if (linkistProject) {
      actionItems.push({
        project_id: linkistProject.id,
        description: 'Send invoice',
        status: 'done',
        notes: 'Completed ✓'
      })
    }

    const { error: actionItemsError } = await supabase
      .from('bettroi_action_items')
      .insert(actionItems)

    if (actionItemsError) {
      console.error('Error creating action items:', actionItemsError)
    } else {
      console.log('Action items created')
    }

    console.log('✅ Database setup completed successfully!')

  } catch (error) {
    console.error('Error setting up database:', error)
  }
}

// Run setup if this file is executed directly
if (typeof window === 'undefined') {
  setupDatabase()
}