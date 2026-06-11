class StrengthError(Exception):
    pass

class StrengthInputError(StrengthError):
    def __init__(self, field, rejected_value):
        self.field = field
        self.rejected_value = rejected_value
        self.message = f"You have entered an incorrect {rejected_value} value in the {field} field."
        super().__init__(self.message)

class StrengthAnalytics:
    def __init__(self, weight_lifted, reps):
        self.verify_performance_inputs(weight_lifted, reps)
        
        self.weight_lifted = weight_lifted
        self.reps = reps

    def verify_performance_inputs(self, weight_lifted, reps):
        if weight_lifted < 2 or weight_lifted > 500:
            raise StrengthInputError('weight lifted', weight_lifted)
        if reps < 1 or reps > 12:
            raise StrengthInputError('reps', reps)
        
    def calculate_1rm(self):
        #Epley Formula
        epley_1rm = self.weight_lifted * (1 + (self.reps / 30))

        #Brzycki Formula
        bryzcki_1rm = self.weight_lifted / (1.0278 - (0.0278 * self.reps))
        
        #Lander Formula
        lander_1rm = self.weight_lifted / (1.013 - (0.02671 * self.reps))
        
        #Average of three formulas
        mean_1rm = (epley_1rm + bryzcki_1rm + lander_1rm) / 3

        return mean_1rm

    def calculate_strength_curve(self):
        strength_curve = {}

        for target_reps in range(1, 13):
            predicted_load = self.calculate_1rm() / (1 + (target_reps / 30))
            strength_curve[target_reps] = predicted_load

        return strength_curve