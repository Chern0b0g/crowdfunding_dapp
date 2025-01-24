import React, { Component } from "react";
import 'bootstrap/dist/css/bootstrap.css'
import web3 from './web3';
import crowdfunding from "./crowdfunding"; // Το ABI του συμβολαίου



class App extends Component {
  // Αρχικοποίηση των state μεταβλητών
  state = {
    coOwnerAddress: "", // Διεύθυνση συνιδιοκτήτης του συμβολαίου
    ownerAddress: "", // Διεύθυνση ιδιοκτήτη του συμβολαίου
    newOwnerAddress: "", // Νέα διεύθυνση ιδιοκτήτη
    balance: 0, // Υπόλοιπο συμβολαίου
    collectedFees: 0, // Συλλεγόμενες προμήθειες
    isDestroyed: false, // Αν το συμβόλαιο έχει καταστραφεί
    liveCampaigns: [], // Ενεργές καμπάνιες
    canceledCampaigns: [], // Ακυρωμένες καμπάνιες
    completedCampaigns: [], // Ολοκληρωμένες καμπάνιες
    bannedEntrepreneurs: [], // Λίστα με αποκλεισμένους επιχειρηματίες
    message: "", // Μηνύματα πληροφόρησης
    currentAccount: '', // Διεύθυνση του τρέχοντος λογαριασμού στο MetaMask
    title: '',  // Τίτλος νέας καμπάνιας
    pledgeCost: '', // Κόστος συμμετοχής
    pledgesNeeded: '', // Απαιτούμενος αριθμός υποσχέσεων
    entrepreneurToBan: ''  // Επιχειρηματίας που θα αποκλειστεί
  };

  // Ενέργειες κατά τη φόρτωση του component
  async componentDidMount() {
    try { // Αν υπάρχει εγκατεστημένο metamask
            // Ορισμός των state μεταβλητών

            // Λήψη της διεύθυνσης του ιδιοκτήτη, συνιδιοκτήτη και των οικονομικών στοιχείων του συμβολαίου
            const ownerAddress = await crowdfunding.methods.owner().call();
            const coOwnerAddress = await crowdfunding.methods.coOwner().call();
            const collectedFees = web3.utils.fromWei(await crowdfunding.methods.getContractFees().call(), 'ether');
            const contractBalanceWei = await crowdfunding.methods.getContractBalance().call();
            const contractBalanceEther = web3.utils.fromWei(contractBalanceWei, 'ether');
            // Ενημέρωση του state με τα στοιχεία του συμβολαίου.
            this.setState({ message: '', ownerAddress, collectedFees, balance: contractBalanceEther, coOwnerAddress });
            
             // Ρύθμιση ακροατών γεγονότων, αν δεν έχουν ρυθμιστεί
            if (!this.eventListenersSet) {
                this.setupEventListeners();
                this.eventListenersSet = true;
            }

            // Έλεγχος για MetaMask και λήψη τρέχοντος λογαριασμού
            try { // Επικοινωνία με το metamask
                const currentAccount = (await window.ethereum.request({ method: 'eth_requestAccounts' }))[0];
                this.setState({ message: '', currentAccount });
                if (!currentAccount) {
                    this.setState({ message: 'No account connected. Please connect MetaMask.' });
                    return;
                }
            } catch (error) { // Αν το metamask δεν έκανε accept το request
                this.setState({ message: 'Metamask has not connected yet' });
            }

            // Φόρτωσε τις ενεργές καμπάνιες
            this.fetchActiveCampaigns();
            // Φόρτωσε τις ακυρωμένες καμπάνιες
            this.fetchCanceledCampaigns();
            // Φόρτωσε τις ολοκληρωμένες καμπάνιες
            this.fetchCompletedCampaigns();
            // Φόρτωσε τα Balance
            this.fetchBalance();

        } catch (error) { // Αν το metamask δεν έχει εγκατασταθεί
            this.setState({ message: 'Metamask is not installed' });
        }
    }

    // Συνάρτηση για τη ρύθμιση ακροατών γεγονότων (event listeners).
    setupEventListeners = async () =>  {
          // Ακρόαση του γεγονότος "PledgeMade" για την ενημέρωση των δεδομένων.
          crowdfunding.events.PledgeMade().on('data', async (data) => {
            this.fetchBalance(); // Ενημέρωση του υπολοίπου.
            this.fetchActiveCampaigns(); // Ενημέρωση των ενεργών καμπανιών.
            this.fetchCanceledCampaigns(); // Ενημέρωση των ακυρωμένων καμπανιών.
            this.fetchCompletedCampaigns(); // Ενημέρωση των ολοκληρωμένων καμπανιών.
          });
          // Ακρόαση του γεγονότος "CampaignCreated" για την ενημέρωση των δεδομένων.
          crowdfunding.events.CampaignCreated().on('data', async (data) => {
            this.fetchBalance(); // Ενημέρωση του υπολοίπου.
            this.fetchActiveCampaigns(); // Ενημέρωση των ενεργών καμπανιών.
            this.fetchCanceledCampaigns(); // Ενημέρωση των ακυρωμένων καμπανιών.
            this.fetchCompletedCampaigns(); // Ενημέρωση των ολοκληρωμένων καμπανιών.
          });
          crowdfunding.events.CampaignCancelled().on('data', async (data) => {
            this.fetchBalance(); // Ενημέρωση του υπολοίπου.
            this.fetchActiveCampaigns(); // Ενημέρωση των ενεργών καμπανιών.
            this.fetchCanceledCampaigns(); // Ενημέρωση των ακυρωμένων καμπανιών.
            this.fetchCompletedCampaigns(); // Ενημέρωση των ολοκληρωμένων καμπανιών.
          });
          crowdfunding.events.CampaignCompleted().on('data', async (data) => {
            this.fetchBalance(); // Ενημέρωση του υπολοίπου.
            this.fetchActiveCampaigns(); // Ενημέρωση των ενεργών καμπανιών.
            this.fetchCanceledCampaigns(); // Ενημέρωση των ακυρωμένων καμπανιών.
            this.fetchCompletedCampaigns(); // Ενημέρωση των ολοκληρωμένων καμπανιών.
          });
          this.fetchBalance(); // Ενημέρωση του υπολοίπου.
          // Ακρόαση αλλαγών στους λογαριασμούς του MetaMask.
          window.ethereum.on('accountsChanged', async (accounts) => {
            if (accounts.length > 0) {
              const currentAccount = (await window.ethereum.request({ method: 'eth_requestAccounts' }))[0];
              this.setState({ message: '', currentAccount });
              this.fetchActiveCampaigns(); // Ενημέρωση των ενεργών καμπανιών.
              this.fetchCanceledCampaigns(); // Ενημέρωση των ακυρωμένων καμπανιών.
              this.fetchCompletedCampaigns(); // Ενημέρωση των ολοκληρωμένων καμπανιών.
              this.fetchBalance(); // Ενημέρωση του υπολοίπου.
            } else {
              // Αν δεν υπάρχουν συνδεδεμένοι λογαριασμοί, εμφάνιση μηνύματος.
              this.setState({ currentAccount: '', message: 'Please connect MetaMask.' });
            }
        });
      }

  

  render() {
    // Έλεγχος αν ο τρέχων λογαριασμός είναι ο ιδιοκτήτης του συμβολαίου.
    const isOwner = this.state.currentAccount === this.state.ownerAddress.toLowerCase();
    const isCoOwner = this.state.currentAccount === this.state.coOwnerAddress.toLowerCase();
    
    return (
      
      <div className="container mt-5">
        {/* Επικεφαλίδα της σελίδας */}
        <h3 className="mb-4 fw-bold">Crowdfunding DApp</h3>
  
        {/* Εμφάνιση του τρέχοντος λογαριασμού που έχει συνδεθεί μέσω MetaMask */}
        <div className="form-group row align-items-center mb-2">
          {/* Ετικέτα για το πεδίο */}
          <label className="col-sm-2 col-form-label text-end pe-2"><strong>Current Address</strong></label>
          <div className="col-sm-10">
            {/* Πεδία κειμένου μόνο για ανάγνωση */}
            <input
              type="text"
              className="form-control"
              value={this.state.currentAccount} // Ο τρέχων λογαριασμός.
              readOnly
              style={{ backgroundColor: "#f8f9fa", // Χρώμα φόντου
                fontWeight: "bold", // Έντονη γραφή
                width: "450px", // Πλάτος
                display: "inline-block" // Εμφάνιση στην ίδια γραμμή
              }}
            />
          </div>
        </div>
  
        {/* Εμφάνιση της διεύθυνσης του ιδιοκτήτη του συμβολαίου */}
        <div className="form-group row align-items-center mb-2">
          {/* Ετικέτα για το πεδίο */}
          <label className="col-sm-2 col-form-label text-end pe-2"><strong>Owner's Address</strong></label>
          <div className="col-sm-10">
            {/* Πεδία κειμένου μόνο για ανάγνωση */}
            <input
              type="text"
              className="form-control"
              value={this.state.ownerAddress} // Διεύθυνση του ιδιοκτήτη.
              readOnly
              style={{ backgroundColor: "#f8f9fa", 
                fontWeight: "bold", 
                width: "450px", 
                display: "inline-block" 
              }}
            />
          </div>
        </div>
  
        {/* Εμφάνιση του υπολοίπου και των συλλεγμένων προμηθειών */}
        <div className="form-group row align-items-center mb-2">
          <div className="col-sm-2 text-end pe-1">
            {/* Ετικέτα και πεδίο για το Balance */}
            <label><strong>Balance</strong></label>
          </div>
          <div className="col-sm-1">
            <input
              type="text"
              className="form-control text-left"
              value={this.state.balance} // Υπόλοιπο συμβολαίου.
              readOnly
              style={{ backgroundColor: "#f8f9fa", 
                fontWeight: "bold", 
                width: "80px", 
                display: "inline-block" 
              }}
            />
          </div>
  
          <div className="col-sm-1 text-end pe-1">
            <label><strong>Collected fees</strong></label>
          </div>
          <div className="col-sm-1">
            <input
              type="text"
              className="form-control text-left"
              value={this.state.collectedFees} // Συλλεγμένες προμήθειες.
              readOnly
              style={{ backgroundColor: "#f8f9fa",
                fontWeight: "bold", 
                width: "80px", 
                display: "inline-block" 
              }}
            />
          </div>
        </div>
        {/* Οριζόντια γραμμή για διαχωρισμό */}
        <hr style={{ border: "1px solid black" }} />
        {/* Ενότητα για τη δημιουργία νέας καμπάνιας */}
        <h3 className="mb-4 fw-bold">New campaign</h3>
        {/* Πεδίο για τον τίτλο της καμπάνιας */}
        <div className="form-group mb-3 ">
          <label className="col-sm-2 col-form-label text-end pe-2"><strong>Title</strong></label>
          <input
            type="text"
            className="form-control"
            value={this.state.title} // Ο τίτλος της καμπάνιας αποθηκεύεται στο state.
            onChange={(event) => this.setState({ title: event.target.value })} // Ενημέρωση του state όταν αλλάζει η τιμή.
            style={{ backgroundColor: "#f8f9fa", // Χρώμα φόντου.
              fontWeight: "bold", // Έντονη γραφή.
              width: "200px", // Πλάτος πεδίου.
              display: "inline-block" // Εμφάνιση στην ίδια γραμμή.
            }}
            placeholder="Campaign's Title" // Προκαθορισμένο κείμενο στο πεδίο.
          />
        </div>
        {/* Πεδίο για το κόστος της υπόσχεσης (pledge cost) */}
        <div className="form-group mb-3">
        <label className="col-sm-2 col-form-label text-end pe-2"><strong>Pledge cost</strong></label>
          <input
            type="number"
            className="form-control"
            value={this.state.pledgeCost} // Το κόστος της υπόσχεσης αποθηκεύεται στο state.
            onChange={(event) => this.setState({ pledgeCost: event.target.value })} // Ενημέρωση του state όταν αλλάζει η τιμή.
            style={{ backgroundColor: "#f8f9fa", fontWeight: "bold", width: "80px", display: "inline-block" }}
            placeholder="0" // Προκαθορισμένο κείμενο στο πεδίο.
          />
        </div>
        {/* Πεδίο για τον αριθμό των απαραίτητων υποσχέσεων (pledges needed) */}
        <div className="form-group mb-3">
        <label className="col-sm-2 col-form-label text-end pe-2"><strong>Number of pledges</strong></label>
          <input
            type="number"
            className="form-control"
            value={this.state.pledgesNeeded} // Ο αριθμός των υπόσχεσεων αποθηκεύεται στο state.
            onChange={(event) => this.setState({ pledgesNeeded: event.target.value })}// Ενημέρωση του state όταν αλλάζει η τιμή.
            style={{ backgroundColor: "#f8f9fa", fontWeight: "bold", width: "80px", display: "inline-block" }}
            placeholder="0" // Προκαθορισμένο κείμενο στο πεδίο.
          />
        </div>
        {/* Κουμπί για τη δημιουργία καμπάνιας */}
        <div className="form-group row mb-3">
          <div className="col-sm-2"></div> {/* Κενό για ευθυγράμμιση */}
          <div className="col-sm-10">
            <button className="btn btn-primary" 
               onClick={this.createCampaign} // Καλεί τη μέθοδο `createCampaign` όταν πατηθεί.
               disabled={isOwner || isCoOwner}// Απενεργοποίηση του κουμπιού αν ο χρήστης είναι ο ιδιοκτήτης ή συνιδιοκτήτης.
               style={{ backgroundColor: isOwner || isCoOwner ? 'grey' : 'blue' }} // Γκρι χρώμα αν είναι απενεργοποιημένο.
            >
              Create
            </button>
          </div>
        </div>

        {/* Εμφάνιση μηνύματος πληροφοριών */}
        {this.state.message && (
          <div className="alert alert-info mt-3">{this.state.message}</div>
        )}

        {/* Οριζόντια γραμμή για διαχωρισμό */}
        <hr style={{ border: "1px solid black" }} />
        {/* Ενότητα για ζωντανές καμπάνιες */}
        <h3 className="mb-4 fw-bold">Live campaigns</h3>
        {/* Πίνακας ζωντανών καμπανιών */}
        <table className="table table-bordered text-center align-middle">
          <thead>
            <tr className="table-light">
              {/* Πρώτη στήλη: Ο επιχειρηματίας */}
              <th scope="col" className="text-truncate" style={{ maxWidth: '250px' }}>Entrepreneur</th>
              {/* Δεύτερη στήλη: Ο τίτλος της καμπάνιας */}
              <th scope="col">Title</th>
              {/* Τρίτη στήλη: Τιμή, υποστηρικτές, εναπομείναντες υποσχέσεις και προσωπικές υποσχέσεις */}
              <th scope="col">Price / Backers / Pledges left / Your Pledges</th>
              {/* Τέταρτη έως έκτη στήλη: Ενέργειες */}
              <th scope="col">Action</th>
              <th scope="col">Action</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {/* Ανάκτηση των ζωντανών καμπανιών από το state */}
            {this.state.liveCampaigns.map((campaign, index) => (
              <tr key={index}>
                {/* Στήλη: Όνομα επιχειρηματία */}
                <td className="text-break" style={{ maxWidth: '250px', fontSize: '0.85rem' }}>{campaign.entrepreneur}</td>
                {/* Στήλη: Τίτλος καμπάνιας */}
                <td>{campaign.title}</td>
                {/* Στήλη: Τιμή, υποστηρικτές, εναπομείναντες υποσχέσεις, προσωπικές υποσχέσεις */}
                <td>
                  {campaign.pledgeCost} | {campaign.pledgesCount} | {campaign.pledgesNeeded} | {campaign.myShares}
                </td>
                {/* Κουμπί: Υπόσχεση (Pledge) */}
                <td>
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() =>
                      this.pledgeToCampaign(campaign.id, 1, campaign.pledgeCost)
                    }
                  >
                    Pledge
                  </button>
                </td>
                 {/* Κουμπί: Ακύρωση καμπάνιας (Cancel) */}
                <td>
                  {/* Το κουμπί εμφανίζεται μόνο αν ο χρήστης είναι ο επιχειρηματίας της καμπάνιας ή ο ιδιοκτήτης του συμβολαίου ή ο συνιδιοκτήτης */}
                  {(campaign.entrepreneur.toLowerCase() === this.state.currentAccount.toLowerCase() || isOwner || isCoOwner) && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => this.cancelCampaign(campaign.id)} // Καλεί τη μέθοδο `cancelCampaign` για ακύρωση
                    >
                      Cancel
                    </button>
                  )}
                </td>
                {/* Κουμπί: Ολοκλήρωση καμπάνιας (Fulfill) */}
                <td>
                  {/* Το κουμπί εμφανίζεται μόνο αν ο χρήστης είναι ο επιχειρηματίας ή ο ιδιοκτήτης του συμβολαίου ή ο συνιδιοκτήτης */}
                  {(campaign.entrepreneur.toLowerCase() === this.state.currentAccount.toLowerCase() || isOwner || isCoOwner) && (
                    <button
                      className="btn btn-warning btn-sm"
                      onClick={() => this.completeCampaign(campaign.id)} // Καλεί τη μέθοδο `completeCampaign` για ολοκλήρωση
                      disabled={!campaign.canComplete}// Απενεργοποίηση αν η καμπάνια δεν μπορεί να ολοκληρωθεί
                      style={{ backgroundColor: !campaign.canComplete ? 'LightYellow' : 'orange' }} // Χρώμα ανάλογα με την κατάσταση
                    >
                      Fulfill
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Οριζόντια γραμμή για διαχωρισμό */}
        <hr style={{ border: "1px solid black" }} />
        {/* Ενότητα για ολοκληρωμένες καμπάνιες */}
        <h3 className="mb-4 fw-bold">Fulfilled campaigns</h3>
        {/* Πίνακας ολοκληρωμένων καμπανιών */}
        <table className="table table-bordered text-center align-middle">
          <thead>
            <tr className="table-light">
              {/* Πρώτη στήλη: Ο επιχειρηματίας */}
              <th scope="col" className="text-truncate" style={{ maxWidth: '250px' }}>Entrepreneur</th>
              {/* Δεύτερη στήλη: Ο τίτλος της καμπάνιας */}
              <th scope="col">Title</th>
              {/* Τρίτη στήλη: Τιμή, υποστηρικτές, εναπομείναντες υποσχέσεις και προσωπικές υποσχέσεις */}
              <th scope="col">Price / Backers / Pledges left / Your Pledges</th>
            </tr>
          </thead>
          <tbody>
            {/* Ανάκτηση των ολοκληρωμένων καμπανιών από το state */}
            {this.state.completedCampaigns.map((campaign, index) => (
              <tr key={index}>
                {/* Στήλη: Όνομα επιχειρηματία */}
                <td className="text-break" style={{ maxWidth: '250px', fontSize: '0.85rem' }}>{campaign.entrepreneur}</td>
                {/* Στήλη: Τίτλος καμπάνιας */}
                <td>{campaign.title}</td>
                {/* Στήλη: Τιμή, υποστηρικτές, εναπομείναντες υποσχέσεις, προσωπικές υποσχέσεις */}
                <td>
                  {campaign.pledgeCost} | {campaign.pledgesCount} | {campaign.pledgesNeeded} | {campaign.myShares}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Οριζόντια γραμμή για διαχωρισμό */}
        <hr style={{ border: "1px solid black" }} />
        {/* Ενότητα για ακυρωμένες καμπάνιες */}
        <div className="d-flex align-items-center mb-4">
          {/* Τίτλος: Ακυρωμένες καμπάνιες */}
          <h3 className="fw-bold me-2">Canceled campaigns</h3>
          {/* Κουμπί "Claim" για επιστροφή χρημάτων */}
          <button 
            className="btn btn-secondary "
             // Το κουμπί είναι απενεργοποιημένο αν καμία ακυρωμένη καμπάνια δεν απαιτεί επιστροφή χρημάτων
            disabled={!this.state.canceledCampaigns.some(campaign => campaign.needsRefund)}
            style={{ 
              backgroundColor: !this.state.canceledCampaigns.some(campaign => campaign.needsRefund) 
                ? 'LightGray' 
                : 'DarkGray' 
            }}
            // Κλήση της μεθόδου refundAll όταν πατηθεί το κουμπί
            onClick={this.refundAll}
            >  
            Claim
          </button>
        </div>
        {/* Πίνακας ακυρωμένων καμπανιών */}
        <table className="table table-bordered text-center align-middle">
          <thead>
            <tr className="table-light">
               {/* Πρώτη στήλη: Επιχειρηματίας */}
              <th scope="col" className="text-truncate" style={{ maxWidth: '250px' }}>Entrepreneur</th>
               {/* Δεύτερη στήλη: Τίτλος */}
              <th scope="col">Title</th>
              {/* Τρίτη στήλη: Τιμή, υποστηρικτές, υπόλοιπο υποσχέσεων, προσωπικές υποσχέσεις */}
              <th scope="col">Price / Backers / Pledges left / Your Pledges</th>
            </tr>
          </thead>
          <tbody>
            {/* Λίστα ακυρωμένων καμπανιών */}
            {this.state.canceledCampaigns.map((campaign, index) => (
              <tr key={index}>
                {/* Στήλη: Επιχειρηματίας */}
                <td className="text-break" style={{ maxWidth: '250px', fontSize: '0.85rem' }}>{campaign.entrepreneur}</td>
                {/* Στήλη: Τίτλος */}
                <td>{campaign.title}</td>
                {/* Στήλη: Τιμή, υποστηρικτές, υπόλοιπο υποσχέσεων, προσωπικές υποσχέσεις */}
                <td>
                  {campaign.pledgeCost} | {campaign.pledgesCount} | {campaign.pledgesNeeded} | {campaign.myShares}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Οριζόντια γραμμή για διαχωρισμό */}
        <hr style={{ border: "1px solid black" }} />
        {/* Πίνακας Ελέγχου */}
        <h3 className="mb-4 fw-bold">Control Panel</h3>

      </div>
    );
  }

  fetchBalance = async () => {
    try {
        // Ανάκτηση του υπολοίπου του συμβολαίου σε Wei
        const contractBalanceWei = await crowdfunding.methods.getContractBalance().call();
        // Μετατροπή του υπολοίπου από Wei σε Ether
        const contractBalanceEther = web3.utils.fromWei(contractBalanceWei, 'ether');
        // Ανάκτηση των συλλεχθέντων προμηθειών σε Ether
        const collectedFees = web3.utils.fromWei(await crowdfunding.methods.getContractFees().call(), 'ether');
         // Ενημέρωση της κατάστασης με το υπόλοιπο και τις προμήθειες
        this.setState({ balance: contractBalanceEther, collectedFees });
    } catch (error) {
      // Χειρισμός σφαλμάτων και ενημέρωση μηνύματος
        console.error('Error fetching contract balance:', error);
        this.setState({ message: `Error fetching balance: ${error.message}` });
    }
  };

  createCampaign = async () => {
    const { title, pledgeCost, pledgesNeeded } = this.state;
    const allTitles = [];
        this.state.liveCampaigns.map((campaign) => {
            allTitles.push(campaign.title);
            console.log(campaign.title)
        });
        this.state.canceledCampaigns.map((campaign) => {
            allTitles.push(campaign.title);
        });
        this.state.completedCampaigns.map((campaign) => {
            allTitles.push(campaign.title);
        });

        // Check if the title already exists
        if (allTitles.includes(title)) {
            this.setState({ message: `A campaign with this title ${title} already exists. Please choose a different title.` });
            return;
        }

    // Έλεγχος αν όλα τα πεδία είναι συμπληρωμένα
    if (!title || !pledgeCost || !pledgesNeeded) {
        this.setState({ message: 'Please fill in all fields.' });
        return;
    }

    // Έλεγχος αν το κόστος υποστήριξης είναι μεγαλύτερο από 0
    if (parseFloat(pledgeCost) <= 0) {
        this.setState({ message: 'Pledge cost must be greater than 0.' });
        return;
    }

    // Ενημέρωση μηνύματος κατά την έναρξη της δημιουργίας καμπάνιας
    this.setState({ message: 'Creating campaign...' });

    try {
       // Ανάκτηση των λογαριασμών του χρήστη
        const accounts = await web3.eth.getAccounts();
        // Κλήση της μεθόδου createCampaign από το smart contract και μετατροπή pledgeCost από Ether σε Wei
        await crowdfunding.methods.createCampaign(title, web3.utils.toWei(pledgeCost, 'ether'), pledgesNeeded).send({
            from: this.state.currentAccount, // Λογαριασμός που στέλνει τη συναλλαγή
            value: web3.utils.toWei('0.02', 'ether'), // Καταχώρηση της απαιτούμενης προμήθειας
        });

        // Ενημέρωση των συλλεχθέντων προμηθειών
        const collectedFees = web3.utils.fromWei(await crowdfunding.methods.getContractFees().call(),'ether');
        // Ενημέρωση μηνύματος επιτυχίας
        this.setState({ message: 'Campaign created successfully!', collectedFees });
    } catch (err) {
      // Χειρισμός σφάλματος και ενημέρωση μηνύματος
        this.setState({ message: `Error: ${err.message}` });
    }
};



fetchActiveCampaigns = async () => {
  try {
    // Ανάκτηση δεδομένων των ενεργών καμπανιών από το smart contract
      const campaignsData = await crowdfunding.methods.getActiveCampaigns().call();
      const { campaignIds, entrepreneurs, pledgeCosts, pledgesNeeded, pledgesCounts } = campaignsData;
      const currentAccount = this.state.currentAccount; // Συνδεδεμένος λογαριασμός
      const campaigns = [];
      console.log('Raw campaigns data:', campaignsData); // Έλεγχος επιστρεφόμενων δεδομένων

      // Επεξεργασία κάθε καμπάνιας
      for (let i = 0; i < campaignIds.length; i++) {
          let myShares = 0; // Αν δεν υπάρχουν μετοχές, η τιμή είναι 0
          
          try {
            // Ανάκτηση των μετοχών του χρήστη για την καμπάνια
              myShares = await crowdfunding.methods.getShares(campaignIds[i], currentAccount).call();
              myShares = parseInt(myShares, 10);
          } catch (error) {
              console.warn(`Error fetching shares for campaign ${campaignIds[i]}:`, error);
              myShares = 0; // Σε περίπτωση σφάλματος, θέτουμε τις μετοχές σε 0
          }
          // Δημιουργία αντικειμένου καμπάνιας
          
          const title = await crowdfunding.methods.getName(campaignIds[i]).call();
          campaigns.push({
              id: campaignIds[i],
              entrepreneur: entrepreneurs[i],
              title, // Ανάκτηση τίτλου καμπάνιας
              pledgeCost: web3.utils.fromWei(pledgeCosts[i], 'ether'), // Μετατροπή κόστους υποστήριξης από Wei σε Ether
              pledgesNeeded: pledgesNeeded[i],
              pledgesCount: pledgesCounts[i],
              remainingShares: pledgesNeeded[i] - pledgesCounts[i], // Υπολογισμός εναπομεινουσών υποστηρίξεων
              myShares,
              canComplete: pledgesNeeded[i] == 0,  // Ελέγχουμε αν μπορεί να ολοκληρωθεί
          });
      }

      // Ενημέρωση κατάστασης με τις καμπάνιες
      this.setState({ liveCampaigns: campaigns });
      // Χειρισμός σφαλμάτων
  } catch (error) {
      console.error('Error fetching campaigns:', error);
      this.setState({ message: `Error fetching campaigns: ${error.message}` });
  }
};


fetchCanceledCampaigns = async () => {
  try {
    // Ανάκτηση δεδομένων ακυρωμένων καμπανιών από το smart contract
      const campaignsData = await crowdfunding.methods.getCancelledCampaigns().call();
      const { campaignIds, entrepreneurs, pledgeCosts, pledgesNeeded, pledgesCounts } = campaignsData;
      const currentAccount = this.state.currentAccount; // Συνδεδεμένος λογαριασμός
      const campaigns = [];
      console.log('Raw campaigns data:', campaignsData); // Έλεγχος επιστρεφόμενων δεδομένων

      // Επεξεργασία κάθε καμπάνιας
      for (let i = 0; i < campaignIds.length; i++) {
          let myShares = 0; // Αν δεν υπάρχουν μετοχές, η τιμή είναι 0
          
          try {
            // Ανάκτηση των μετοχών του χρήστη για την καμπάνια
              myShares = await crowdfunding.methods.getShares(campaignIds[i], currentAccount).call();
              myShares = parseInt(myShares, 10);
          } catch (error) {
              console.warn(`Error fetching shares for campaign ${campaignIds[i]}:`, error);
              myShares = 0; // Σε περίπτωση σφάλματος, θέτουμε τις μετοχές σε 0
          }
          // Δημιουργία αντικειμένου καμπάνιας
          const title = await crowdfunding.methods.getName(campaignIds[i]).call();
          campaigns.push({
              id: campaignIds[i],
              entrepreneur: entrepreneurs[i],
              title, // Ανάκτηση τίτλου καμπάνιας
              pledgeCost: web3.utils.fromWei(pledgeCosts[i], 'ether'), // Μετατροπή κόστους υποστήριξης από Wei σε Ether
              pledgesNeeded: pledgesNeeded[i],
              pledgesCount: pledgesCounts[i],
              remainingShares: pledgesNeeded[i] - pledgesCounts[i], // Υπολογισμός εναπομεινουσών υποστηρίξεων
              myShares,
              canComplete: pledgesNeeded[i] == 0, // Ελέγχουμε αν μπορεί να ολοκληρωθεί
              needsRefund: myShares > 0, // Αν ο χρήστης χρειάζεται επιστροφή χρημάτων
          });
      }

      // Ενημέρωση κατάστασης με τις ακυρωμένες καμπάνιες
      this.setState({ canceledCampaigns: campaigns });
  } catch (error) {
    // Χειρισμός σφαλμάτων
      console.error('Error fetching campaigns:', error);
      this.setState({ message: `Error fetching campaigns: ${error.message}` });
  }
};


fetchCompletedCampaigns = async () => {
  try {
    // Ανάκτηση δεδομένων ολοκληρωμένων καμπανιών από το smart contract
      const campaignsData = await crowdfunding.methods.getCompletedCampaigns().call();
      const { campaignIds, entrepreneurs, pledgeCosts, pledgesNeeded, pledgesCounts } = campaignsData;
      const currentAccount = this.state.currentAccount; // Συνδεδεμένος λογαριασμός
      const campaigns = [];
      console.log('Raw campaigns data:', campaignsData); // Έλεγχος επιστρεφόμενων δεδομένων

      for (let i = 0; i < campaignIds.length; i++) {
          let myShares = 0; // Αν δεν υπάρχουν μετοχές, η τιμή είναι 0
          
          try {
            // Ανάκτηση των μετοχών του χρήστη για την καμπάνια
              myShares = await crowdfunding.methods.getShares(campaignIds[i], currentAccount).call();
              myShares = parseInt(myShares, 10);
          } catch (error) {
              console.warn(`Error fetching shares for campaign ${campaignIds[i]}:`, error);
              myShares = 0; // Σε περίπτωση σφάλματος, θέτουμε τις μετοχές σε 0
          }
          // Δημιουργία αντικειμένου καμπάνιας
          const title = await crowdfunding.methods.getName(campaignIds[i]).call();
          campaigns.push({
              id: campaignIds[i],
              entrepreneur: entrepreneurs[i],
              title,// Ανάκτηση τίτλου καμπάνιας
              pledgeCost: web3.utils.fromWei(pledgeCosts[i], 'ether'),// Μετατροπή κόστους υποστήριξης από Wei σε Ether
              pledgesNeeded: pledgesNeeded[i],
              pledgesCount: pledgesCounts[i],
              remainingShares: pledgesNeeded[i] - pledgesCounts[i], // Υπολογισμός εναπομεινουσών υποστηρίξεων
              myShares,
              canComplete: pledgesNeeded[i] == 0, // Ελέγχουμε αν μπορεί να ολοκληρωθεί
          });
      }

      // Ενημέρωση κατάστασης με τις ολοκληρωμένες καμπάνιες
      this.setState({ completedCampaigns: campaigns });
  } catch (error) {
    // Χειρισμός σφαλμάτων
      console.error('Error fetching campaigns:', error);
      this.setState({ message: `Error fetching campaigns: ${error.message}` });
  }
};


pledgeToCampaign = async (campaignId, numPledges, pledgeCostInEther) => {
  //Συνάρτηση Επένδησης
  try {
    // Έλεγχος για ενεργό λογαριασμό
    const { currentAccount } = this.state;
    if (!currentAccount) {
      this.setState({ message: "Please connect your MetaMask account." });
      return;
    }

    // Κλήση της συνάρτησης pledge από το συμβόλαιο
    const tx = await crowdfunding.methods.pledge(campaignId, numPledges).send({
      from: currentAccount,
      value: web3.utils.toWei(pledgeCostInEther.toString(), 'ether'), // Μετατροπή του ποσού σε Wei
    });

    console.log("Transaction successful:", tx);
    this.setState({ message: "Pledge successful!" });

    // Ανανεώνουμε τα δεδομένα της εφαρμογής (π.χ. καμπάνιες)
    this.fetchBalance();
    this.fetchActiveCampaigns();
    this.fetchCanceledCampaigns();
    this.fetchCompletedCampaigns();
  } catch (error) {
    console.error("Error during pledge:", error);
    this.setState({ message: `Pledge failed: ${error.message}` });
  }
};

// Συνάρτηση για ακύρωση μιας καμπάνιας
cancelCampaign = async (campaignId) => {
   // Ενημέρωση του μηνύματος κατάστασης στην εφαρμογή
  this.setState({ message: "Cancelling the campaign..." });
  try {
    // Κλήση της μεθόδου cancelCampaign από το smart contract
    await crowdfunding.methods.cancelCampaign(campaignId).send({
      from: this.state.currentAccount, // Ο λογαριασμός που εκτελεί τη συναλλαγή
    });
     // Ενημέρωση του χρήστη για την επιτυχημένη ακύρωση
    this.setState({ message: `Campaign ${campaignId} has been cancelled successfully.` });
    this.fetchBalance(); // Ενημέρωση υπολοίπου συμβολαίου
    this.fetchActiveCampaigns(); // Ανανεώνει τις ενεργές καμπάνιες
    this.fetchCanceledCampaigns();// Ανανεώνει τις ακυρωμένες καμπάνιες
    this.fetchCompletedCampaigns(); // Ανανεώνει τις ολοκληρωμένες καμπάνιες
  } catch (error) {
    // Χειρισμός σφάλματος κατά την ακύρωση
    this.setState({ message: `Error cancelling campaign: ${error.message}` });
  }
};

// Συνάρτηση για ολοκλήρωση μιας καμπάνιας
completeCampaign = async (campaignId) => {
  try {
      const { currentAccount } = this.state;
      
      this.setState({ message: 'Completing campaign...' }); // Ο συνδεδεμένος λογαριασμός
      
      // Κλήση της μεθόδου completeCampaign από το smart contract
      await crowdfunding.methods.completeCampaign(campaignId)
          .send({ from: currentAccount });
       // Ενημέρωση του χρήστη για την επιτυχημένη ολοκλήρωση
      this.setState({ message: 'Campaign completed successfully!' });
      
      // Ενημέρωση του UI
       // Ενημέρωση των δεδομένων της εφαρμογής μετά την ολοκλήρωση
      this.fetchBalance(); // Ενημέρωση υπολοίπου συμβολαίου
      this.fetchActiveCampaigns(); // Ανανεώνει τις ενεργές καμπάνιες
      this.fetchCompletedCampaigns(); // Ανανεώνει τις ολοκληρωμένες καμπάνιες
      this.fetchCanceledCampaigns(); // Ανανεώνει τις ακυρωμένες καμπάνιες
  } catch (error) {
    // Χειρισμός σφάλματος κατά την ολοκλήρωση
      console.error('Error completing campaign:', error);
      this.setState({ message: 'Failed to complete campaign. Check console for details.' });
  }
};


// Συνάρτηση για επιστροφή όλων των pledges από ακυρωμένες καμπάνιες
refundAll = async () => {
   // Ενημέρωση του χρήστη ότι ξεκινά η διαδικασία επιστροφής
  this.setState({ message: "Processing your refund request..." });
  try {
      // Κλήση της μεθόδου refundAll από το smart contract
      await crowdfunding.methods.refundAll().send({
          from: this.state.currentAccount, // Ο λογαριασμός που εκτελεί τη συναλλαγή
      });

      // Ενημέρωση του χρήστη για την επιτυχημένη επιστροφή
      this.setState({ message: "Refund successful!" });
      // Ενημέρωση των δεδομένων της εφαρμογής μετά την επιστροφή
      this.fetchBalance(); // Ενημέρωση υπολοίπου συμβολαίου
      this.fetchActiveCampaigns(); // Ανανεώνει τις ενεργές καμπάνιες
      this.fetchCompletedCampaigns(); // Ανανεώνει τις ολοκληρωμένες καμπάνιες
      this.fetchCanceledCampaigns(); // Ανανεώνει τις ακυρωμένες καμπάνιες
  } catch (error) {
    // Χειρισμός σφάλματος κατά την αποζημείωση
      console.error("Refund failed:", error);
      this.setState({ message: "Refund failed. Please try again later." });
  }
};


}
export default App;